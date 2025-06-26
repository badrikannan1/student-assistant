// src/sis/sis.adapter.factory.ts
import { ISisAdapter } from './sis.interface';
import { AnthologySisAdapter } from './adapters/anthology.sis.adapter';
import { UniversityXCustomApiAdapter } from './adapters/universityX.custom.api.adapter';

// Import other adapters as you create them

export enum SisType {
  ANTHOLOGY = 'anthology',
  UNIVERSITY_X_CUSTOM = 'university_x_custom',
  // Add other SIS types
}

// This would typically come from your tenant's configuration in a database
export interface TenantSisConfig {
  sisType: SisType;
  credentials: any; // This will vary based on sisType
  // e.g., for Banner: { apiKey: '...', baseUrl: '...' }
  // e.g., for UniversityX: { authToken: '...', apiEndpoint: '...' }
}

export class SisAdapterFactory {
  public static createAdapter(config: TenantSisConfig): ISisAdapter {
    switch (config.sisType) {
      case SisType.ANTHOLOGY:
        if (!config.credentials.applicationKey || !config.credentials.baseUrl) {
          throw new Error('Missing Banner API key or base URL in tenant config.');
        }
        return new AnthologySisAdapter(config.credentials);
      case SisType.UNIVERSITY_X_CUSTOM:
         if (!config.credentials.authToken || !config.credentials.apiEndpoint) {
          throw new Error('Missing UniversityX auth token or API endpoint in tenant config.');
        }
        return new UniversityXCustomApiAdapter(config.credentials);
      // Add cases for other SIS types
      default:
        throw new Error(`Unsupported SIS type: ${config.sisType}`);
    }
  }
}
