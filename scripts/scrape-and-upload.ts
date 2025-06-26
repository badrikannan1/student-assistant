// scripts/scrape-and-upload.ts
import axios from 'axios';
import * as cheerio from 'cheerio';
import { BlobServiceClient } from '@azure/storage-blob';
import dotenv from 'dotenv';

// Load environment variables from a .env file at the project root
dotenv.config();

// --- Type Definitions for Configuration ---
interface SourceConfig {
  url: string;
  selectors: string[]; // Changed to an array of selectors
}
interface ContentTypeConfig {
  sources: SourceConfig[];
  outputFileName: string;
}

interface TenantConfig {
  containerName: string;
  contentTypes: {
    [contentType: string]: ContentTypeConfig;
  };
}

// --- Configuration ---
// In a real-world scenario, load these from environment variables or a secure config file.
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || "";

const TENANT_CONFIG: { [key: string]: TenantConfig } = {
  'joyce_uni_id': {
    containerName: 'joyce-uni-public-content', // A dedicated container for this tenant
    contentTypes: {
      'financial-aid': {
        // Each source now has its own URL and a specific, more accurate CSS selector.
        sources: [
          {
            url: 'https://www.joyce.edu/financial-aid/',
            selectors: ['.page-financial-aid'], // Wrapped in an array
          },
          {
            url: 'https://www.joyce.edu/financial-aid/scholarships-grants/',
            selectors: ["div.entry-content",
                        "h3",
                        "h4",
                        "div.entry-content p",
                        "ul",
                        "ul li"], // Wrapped in an array
          },
        ],
        outputFileName: 'financial_aid.json', // Filename can be simpler now
      },
      // ... add other content types for Joyce, e.g., 'admissions'
    },
  },
  // ... add other tenants
};

if (!AZURE_STORAGE_CONNECTION_STRING) {
  console.error('Error: AZURE_STORAGE_CONNECTION_STRING environment variable is not set.');
  process.exit(1);
}

/**
 * Scrapes content from a list of source configurations.
 * @param sources The array of source objects, each with a URL and a selector.
 * @returns Aggregated text content from all crawled pages.
 */
async function scrapeUrls(sources: SourceConfig[]): Promise<string> {
  let aggregatedText = '';

  for (const source of sources) {
    try {
      console.log(`Scraping content from: ${source.url}`);
      const { data: html } = await axios.get(source.url);
      const $ = cheerio.load(html);

      let pageContent = '';
      let foundContent = false;

      // Combine all selectors for the current URL into a single string for Cheerio
      const combinedSelector = source.selectors.join(', ');

      const contentElements = $(combinedSelector);

      if (!contentElements.length) {
        console.warn(`Warning: No content found for any selector (${combinedSelector}) on page ${source.url}.`);
      } else {
        pageContent = contentElements.text().replace(/\s\s+/g, ' ').trim();
        if (pageContent) {
          foundContent = true;
        }
      }

      if (foundContent) {
        aggregatedText += `\n\n--- Content from ${source.url} ---\n\n` + pageContent;
      } else {
        console.warn(`No meaningful text content extracted from ${source.url} using selectors: ${combinedSelector}`);
      }
    } catch (error) {
      console.error(`Failed to scrape ${source.url}:`, error);
      // Continue to the next URL even if one fails
    }
  }
  return aggregatedText.trim();
}

/**
 * Uploads the processed content to Azure Blob Storage.
 * @param fileName The name of the blob to create.
 * @param content The content to upload.
 */
async function uploadToAzure(containerName: string, fileName: string, content: object): Promise<void> {
  console.log(`Uploading to Azure container "${containerName}" as ${fileName}...`);
  const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
  const containerClient = blobServiceClient.getContainerClient(containerName);

  // Ensure the container exists and has public access
  await containerClient.createIfNotExists({ access: 'blob' });

  const blockBlobClient = containerClient.getBlockBlobClient(fileName);
  const data = JSON.stringify(content, null, 2);

  await blockBlobClient.upload(data, data.length, {
    blobHTTPHeaders: { blobContentType: 'application/json' }
  });

  console.log(`Successfully uploaded to: ${blockBlobClient.url}`);
}

/**
 * Main function to orchestrate the scraping and uploading process.
 */
async function main() {
  // Use Object.keys for safer iteration over own properties
  for (const tenantId of Object.keys(TENANT_CONFIG)) {
    const tenant = TENANT_CONFIG[tenantId];
    for (const contentType of Object.keys(tenant.contentTypes)) {
      if (Object.prototype.hasOwnProperty.call(tenant.contentTypes, contentType)) {
        const config = tenant.contentTypes[contentType];
        try {
          console.log(`\n--- Starting scrape for ${tenantId} / ${contentType} ---`);
          const extractedText = await scrapeUrls(config.sources);
          
          if (!extractedText) {
            console.warn(`No content extracted for ${tenantId} / ${contentType}. Skipping upload.`);
            continue;
          }

          // We wrap the content in a simple JSON object structure
          const jsonContent = {
            sourceUrls: config.sources.map(s => s.url), // Keep track of where the content came from
            scrapedAt: new Date().toISOString(),
            content: extractedText,
          };

          await uploadToAzure(tenant.containerName, config.outputFileName, jsonContent);
        } catch (error) {
          console.error(`Failed to process ${contentType} for tenant ${tenantId}:`, error);
        }
      }
    }
  }
}

main().catch(error => {
  console.error('An unexpected error occurred:', error);
  process.exit(1);
});