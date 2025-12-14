import crypto from 'crypto';
import { promises as fs } from 'fs';
import { resolveKeyFilePath } from './config';
import { logger } from '../logger';

/**
 * HimKosh Encryption/Decryption Utilities
 * Based on CTP Technical Specification
 * 
 * Algorithm: AES-128 (Rijndael)
 * Mode: CBC
 * Padding: PKCS7
 * Key Size: 128 bits (16 bytes)
 * Block Size: 128 bits (16 bytes)
 */

export class HimKoshCrypto {
  private keyFilePath: string;
  private key: Buffer | null = null;
  private iv: Buffer | null = null;
  private log = logger.child({ module: "himkosh-crypto" });

  constructor(keyFilePath?: string) {
    this.keyFilePath = resolveKeyFilePath(keyFilePath);
  }

  /**
   * Load encryption key and IV from file
   * CRITICAL FIX #3: DLL uses IV = key (first 16 bytes), NOT separate IV
   * Key file format from CTP:
   * - Must be exactly 16 bytes for the key
   * - IV is set equal to the key (actual DLL behavior)
   */
  private async loadKey(): Promise<{ key: Buffer; iv: Buffer }> {
    if (this.key && this.iv) {
      this.log.debug('Using cached key/IV');
      return { key: this.key, iv: this.iv };
    }

    try {
      this.log.debug('Loading key from file', { path: this.keyFilePath });
      const keyData = await fs.readFile(this.keyFilePath);
      this.log.debug('Read key file', { bytes: keyData.length });
      
      // Extract first 16 bytes as key (even if file is longer)
      const keyBytes = Buffer.alloc(16);
      keyData.copy(keyBytes, 0, 0, Math.min(16, keyData.length));
      this.key = keyBytes;
      this.log.debug('Key loaded', { bytes: 16 });
      
      // CRITICAL FIX #3: Use key as IV (first 16 bytes of echallan.key)
      // This matches actual DLL behavior (doc/dummy code was misleading)
      this.iv = keyBytes; // IV = key (same buffer reference)
      this.log.debug('IV aligned with key (DLL behavior)');
      
      return { key: this.key, iv: this.iv };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Key file not found at: ${this.keyFilePath}. Please obtain echallan.key from CTP team or set HIMKOSH_KEY_FILE_PATH.`);
    }
  }

  /**
   * Encrypt data string using AES-128-CBC
   * .NET backend expects ASCII encoding (NOT UTF-8)
   * @param textToEncrypt - Plain text string to encrypt
   * @returns Base64 encoded encrypted string
   */
  async encrypt(textToEncrypt: string): Promise<string> {
    try {
      const { key, iv } = await this.loadKey();
      
      // Create cipher with separate key and IV
      const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
      
      // CRITICAL: Use 'ascii' encoding to match .NET's Encoding.ASCII (NOT UTF-8)
      let encrypted = cipher.update(textToEncrypt, 'ascii', 'base64');
      encrypted += cipher.final('base64');
      
      return encrypted;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Encryption failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Decrypt data string using AES-128-CBC
   * .NET backend uses ASCII encoding (NOT UTF-8)
   * @param textToDecrypt - Base64 encoded encrypted string
   * @returns Decrypted plain text string
   */
  async decrypt(textToDecrypt: string): Promise<string> {
    try {
      const { key, iv } = await this.loadKey();
      
      // Create decipher with separate key and IV
      const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
      
      // CRITICAL: Use 'ascii' encoding to match .NET's Encoding.ASCII.GetString()
      let decrypted = decipher.update(textToDecrypt, 'base64', 'ascii');
      decrypted += decipher.final('ascii');
      
      return decrypted;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Decryption failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generate MD5 checksum for data string.
   * HimKosh reference DLL emits lowercase hexadecimal using UTF-8 bytes.
   * @param dataString - String to generate checksum for
   * @returns MD5 checksum in lowercase hexadecimal
   */
  static generateChecksum(dataString: string): string {
    const hash = crypto.createHash('md5');
    hash.update(dataString, 'utf8');
    return hash.digest('hex');
  }

  /**
   * Verify checksum of received data
   * @param dataString - Data string without checksum
   * @param receivedChecksum - Checksum to verify against
   * @returns true if checksums match (case-insensitive comparison)
   */
  static verifyChecksum(dataString: string, receivedChecksum: string): boolean {
    const calculatedChecksum = this.generateChecksum(dataString);
    return calculatedChecksum.toUpperCase() === receivedChecksum.toUpperCase();
  }
}

/**
 * Build pipe-delimited request string for HimKosh
 * @param params - Request parameters
 * @returns Object with coreString (for checksum) and fullString (for encryption)
 */
export function buildRequestString(params: {
  deptId: string;
  deptRefNo: string;
  totalAmount: number;
  tenderBy: string;
  appRefNo: string;
  head1: string;
  amount1: number;
  ddo: string;
  periodFrom: string;
  periodTo: string;
  head2?: string;
  amount2?: number;
  head3?: string;
  amount3?: number;
  head4?: string;
  amount4?: number;
  head10?: string;
  amount10?: number;
  serviceCode?: string;
  returnUrl?: string;
}): { coreString: string; fullString: string } {
  // Build base string (mandatory fields)
  // CRITICAL: Field ORDER must match government code EXACTLY!
  // CRITICAL FIX #2: All amounts must be integers (no decimals)
  let parts = [
    `DeptID=${params.deptId}`,
    `DeptRefNo=${params.deptRefNo}`,
    `TotalAmount=${Math.round(params.totalAmount)}`, // Ensure integer
    `TenderBy=${params.tenderBy}`,
    `AppRefNo=${params.appRefNo}`,
    `Head1=${params.head1}`,
    `Amount1=${Math.round(params.amount1)}`, // Ensure integer
  ];

  // Add Head2/Amount2 BEFORE Ddo (government code order)
  // CRITICAL: Government code includes Head2/Amount2 ALWAYS (even if Amount2=0)
  if (
    params.head2 &&
    params.amount2 !== undefined &&
    Math.round(params.amount2) > 0
  ) {
    parts.push(`Head2=${params.head2}`);
    parts.push(`Amount2=${Math.round(params.amount2)}`); // Ensure integer
  }

  // Add Ddo AFTER Head2/Amount2
  parts.push(`Ddo=${params.ddo}`);
  parts.push(`PeriodFrom=${params.periodFrom}`);
  parts.push(`PeriodTo=${params.periodTo}`);
  if (params.head3 && params.amount3 && params.amount3 > 0) {
    parts.push(`Head3=${params.head3}`);
    parts.push(`Amount3=${Math.round(params.amount3)}`); // Ensure integer
  }
  if (params.head4 && params.amount4 && params.amount4 > 0) {
    parts.push(`Head4=${params.head4}`);
    parts.push(`Amount4=${Math.round(params.amount4)}`); // Ensure integer
  }
  if (params.head10 && params.amount10 && params.amount10 > 0) {
    parts.push(`Head10=${params.head10}`);
    parts.push(`Amount10=${Math.round(params.amount10)}`); // Ensure integer
  }

  if (params.serviceCode) {
    parts.push(`Service_code=${params.serviceCode}`);
  }
  if (params.returnUrl) {
    parts.push(`return_url=${params.returnUrl}`);
  }

  const dataString = parts.join('|');
  return { coreString: dataString, fullString: dataString };
}

/**
 * Parse pipe-delimited response string from HimKosh
 * @param responseString - Decrypted response string
 * @returns Parsed response object
 */
export function parseResponseString(responseString: string): {
  echTxnId: string;
  bankCIN: string;
  bank: string;
  status: string;
  statusCd: string;
  appRefNo: string;
  amount: string;
  paymentDate: string;
  deptRefNo: string;
  bankName: string;
  checksum: string;
} {
  const parts = responseString.split('|');
  const data: Record<string, string> = {};

  for (const part of parts) {
    const [rawKey, value] = part.split('=');
    if (rawKey && value !== undefined) {
      const key = rawKey.trim().toLowerCase();
      data[key] = value;
    }
  }

  return {
    echTxnId: data.echtxnid || '',
    bankCIN: data.bankcin || '',
    bank: data.bank || '',
    status: data.status || '',
    statusCd: data.statuscd || '',
    appRefNo: data.apprefno || '',
    amount: data.amount || '',
    paymentDate: data.payment_date || '',
    deptRefNo: data.deptrefno || '',
    bankName: data.bankname || '',
    checksum: data.checksum || '',
  };
}

/**
 * Build double verification request string
 * @param params - Verification parameters
 * @returns Pipe-delimited string with checksum
 */
export function buildVerificationString(params: {
  appRefNo: string;
  serviceCode: string;
  merchantCode: string;
}): string {
  const dataString = `AppRefNo=${params.appRefNo}|Service_code=${params.serviceCode}|merchant_code=${params.merchantCode}`;
  const checksum = HimKoshCrypto.generateChecksum(dataString);
  return `${dataString}|checkSum=${checksum}`;
}
