// src/proxy-server.ts
import express from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import cors from 'cors'; // Import cors middleware
import http from 'http';
import net from 'net';

const app = express();
const PORT = 3001; // Port for the proxy server

// Enable CORS for all origins.
// In a production environment, you should restrict this to specific origins.
app.use(cors());

// Get the target URL from environment variables
const ANTHOLOGY_API_BASE_URL = process.env.REACT_APP_JOYCE_SIS_ANTHOLOGY_API_BASE_URL;

console.log(`Attempting to read REACT_APP_JOYCE_SIS_ANTHOLOGY_API_BASE_URL: "${ANTHOLOGY_API_BASE_URL}"`);

if (!ANTHOLOGY_API_BASE_URL) {
  console.error('Error: REACT_APP_JOYCE_SIS_ANTHOLOGY_API_BASE_URL environment variable is not set.');
  console.error('Please set this variable before starting the proxy server.');
  process.exit(1); // Exit the process if the critical environment variable is missing
}

let targetUrl: URL; // Explicitly declare targetUrl as a URL object
try {
  targetUrl = new URL(ANTHOLOGY_API_BASE_URL);
  console.log(`Successfully parsed target URL: ${targetUrl.href}`);
} catch (e: any) { // Explicitly type 'e' as 'any' or 'Error'
  console.error(`Error: REACT_APP_JOYCE_SIS_ANTHOLOGY_API_BASE_URL is not a valid URL: "${ANTHOLOGY_API_BASE_URL}". Error: ${e.message}`);
  process.exit(1);
}

// Configuration for the Anthology API proxy
const anthologyProxyConfig: Options = {
  target: targetUrl, // This is correct, as http-proxy-middleware's Options accepts a URL object
  changeOrigin: true, // Crucial for name-based virtual hosted sites
  pathRewrite: {
    // This rewrites the path:
    // When using app.use('/context', proxy), the 'context' part is stripped before pathRewrite.
    // So, '^/' matches the beginning of the path *after* '/api/anthology' has been removed.
    // Requests to http://localhost:3001/api/anthology/StudentEnrollmentPeriods will become
    // https://api.ellucian.com/ds/campusnexus/StudentEnrollmentPeriods
    '^/': '/ds/campusnexus/',
  },
  // In http-proxy-middleware v3, event handlers are nested under the 'on' property.
  on: {
    proxyReq: (proxyReq: http.ClientRequest, req: http.IncomingMessage, res: http.ServerResponse) => {
      console.log(`Proxying request: ${req.method} ${req.url} -> ${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`);
      // The Authorization header (ApplicationKey) is expected to be sent by the client (AnthologySisAdapter)
      // and will be automatically forwarded by http-proxy-middleware.
    },
    proxyRes: (proxyRes: http.IncomingMessage, req: http.IncomingMessage, res: http.ServerResponse) => {
      // Optional: Log response headers or modify them if needed
      // console.log('Proxy Response Headers:', proxyRes.headers);
      // CORS headers are handled by the `cors` middleware applied globally to `app`.
    },
    error: (err: Error, req: http.IncomingMessage, res: http.ServerResponse | net.Socket) => {
      console.error('Proxy error:', err);
      // The 'res' object can be a ServerResponse or a Socket.
      // We should only call HTTP methods if it's a ServerResponse.
      if (res instanceof http.ServerResponse) {
        res.writeHead(500, {
          'Content-Type': 'text/plain',
        });
        res.end('Something went wrong with the proxy.');
      }
    },
  },
};

// Apply the proxy middleware to requests starting with /api/anthology
app.use('/api/anthology', createProxyMiddleware(anthologyProxyConfig));

// Start the proxy server
app.listen(PORT, () => {
  console.log(`Proxy server listening on port ${PORT}`);
  console.log(`Requests to http://localhost:${PORT}/api/anthology/... will be proxied to ${targetUrl.href.replace(/\/$/, '')}/ds/campusnexus/...`);
});