/**
 * HimKosh Payment Gateway Configuration
 * Store sensitive credentials in Replit Secrets
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config as appConfig } from '@shared/config';
import { logger } from '../logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function resolveKeyFilePath(explicitPath?: string): string {
  const candidates = [
    explicitPath,
    appConfig.himkosh.keyFilePath,
    path.resolve(process.cwd(), 'server/himkosh/echallan.key'),
    path.resolve(process.cwd(), 'dist/himkosh/echallan.key'),
    path.resolve(process.cwd(), 'dist/echallan.key'),
    path.join(__dirname, 'echallan.key'),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // ignore and continue to next candidate
    }
  }

  // Fall back to module-relative path; loadKey will throw a clearer error
  return path.join(__dirname, 'echallan.key');
}

const defaultEndpoints = {
  paymentUrl: 'https://himkosh.hp.nic.in/echallan/WebPages/wrfApplicationRequest.aspx',
  verificationUrl: 'https://himkosh.hp.nic.in/eChallan/webpages/AppVerification.aspx',
  challanPrintUrl: 'https://himkosh.hp.nic.in/eChallan/challan_reports/reportViewer.aspx',
  searchUrl: 'https://himkosh.hp.nic.in/eChallan/SearchChallan.aspx',
};

const himkoshLog = logger.child({ module: "himkosh-config" });

export const himkoshConfig = {
  // CTP API Endpoints
  paymentUrl: appConfig.himkosh.paymentUrl || defaultEndpoints.paymentUrl,
  verificationUrl: appConfig.himkosh.verificationUrl || defaultEndpoints.verificationUrl,
  challanPrintUrl: appConfig.himkosh.challanPrintUrl || defaultEndpoints.challanPrintUrl,
  searchChallanUrl: appConfig.himkosh.searchUrl || defaultEndpoints.searchUrl,

  // Merchant Configuration (from CTP team)
  merchantCode: appConfig.himkosh.merchantCode || '',
  deptId: appConfig.himkosh.deptId || '',
  serviceCode: appConfig.himkosh.serviceCode || '',
  ddo: appConfig.himkosh.ddo || '',

  // Head of Account Codes (Budget heads)
  heads: {
    registrationFee: appConfig.himkosh.head || '',
    secondaryHead: appConfig.himkosh.secondaryHead,
    secondaryHeadAmount: appConfig.himkosh.secondaryHeadAmount,
  },

  // Return URL for payment callback
  returnUrl: appConfig.himkosh.returnUrl || 'https://hptourism.osipl.dev/api/himkosh/callback',

  // Key file path (will be provided by CTP team)
  keyFilePath: resolveKeyFilePath(appConfig.himkosh.keyFilePath),
};

/**
 * Validate HimKosh configuration
 * @returns true if all required config is present
 */
export function validateHimKoshConfig(): { valid: boolean; missingFields: string[] } {
  const requiredFields = [
    'merchantCode',
    'deptId',
    'serviceCode',
    'ddo',
  ];

  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (!himkoshConfig[field as keyof typeof himkoshConfig]) {
      missingFields.push(field);
    }
  }

  // Check if at least one head is configured
  if (!himkoshConfig.heads.registrationFee) {
    missingFields.push('heads.registrationFee');
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Get configured or placeholder values
 * This allows development/testing even without CTP credentials
 */
export function getHimKoshConfig() {
  const config = validateHimKoshConfig();
  himkoshLog.info('Validation result', {
    valid: config.valid,
    missingFields: config.missingFields,
    merchantCode: !!himkoshConfig.merchantCode,
    deptId: !!himkoshConfig.deptId,
    serviceCode: !!himkoshConfig.serviceCode,
    ddo: !!himkoshConfig.ddo,
    head: !!himkoshConfig.heads.registrationFee,
    secondaryHead: !!himkoshConfig.heads.secondaryHead,
  });
  
  if (!config.valid) {
    himkoshLog.warn('HimKosh configuration incomplete', { missingFields: config.missingFields });
    himkoshLog.warn('Using placeholder values for development/testing');
    
    return {
      ...himkoshConfig,
      merchantCode: himkoshConfig.merchantCode || 'HIMKOSH228',
      deptId: himkoshConfig.deptId || '228',
      serviceCode: himkoshConfig.serviceCode || 'TSM',
      ddo: himkoshConfig.ddo || 'SML10-001',
      heads: {
        registrationFee: himkoshConfig.heads.registrationFee || '0230-00-104-01',
        secondaryHead: himkoshConfig.heads.secondaryHead,
        secondaryHeadAmount: himkoshConfig.heads.secondaryHeadAmount,
      },
      isConfigured: true,
      configStatus: 'placeholder' as const,
    };
  }

  himkoshLog.info('All credentials configured - production mode enabled');
  return {
    ...himkoshConfig,
    isConfigured: true,
    configStatus: 'production' as const,
  };
}
