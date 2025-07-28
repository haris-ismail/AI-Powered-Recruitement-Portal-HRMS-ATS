import crypto from 'crypto';
import { createHash } from 'crypto';

interface SecretConfig {
  jwtSecret: string;
  csrfSecret: string;
  encryptionKey: string;
}

class SecretManager {
  private static instance: SecretManager;
  private secrets: SecretConfig | null = null;
  private secretHash: string | null = null;

  private constructor() {}

  static getInstance(): SecretManager {
    if (!SecretManager.instance) {
      SecretManager.instance = new SecretManager();
    }
    return SecretManager.instance;
  }

  /**
   * Initialize and validate secrets
   */
  initialize(): SecretConfig {
    if (this.secrets) {
      return this.secrets;
    }

    const jwtSecret = this.getJWTSecret();
    const csrfSecret = this.getCSRFSecret();
    const encryptionKey = this.getEncryptionKey();

    this.secrets = {
      jwtSecret,
      csrfSecret,
      encryptionKey
    };

    // Store hash for validation
    this.secretHash = this.generateSecretHash();

    this.validateSecrets();
    this.logSecretStatus();

    return this.secrets;
  }

  /**
   * Get JWT secret with validation
   */
  private getJWTSecret(): string {
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    if (secret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }

    if (secret === 'your-secret-key' || secret === 'your_jwt_secret_key') {
      throw new Error('JWT_SECRET cannot use default/example values');
    }

    return secret;
  }

  /**
   * Get CSRF secret with validation
   */
  private getCSRFSecret(): string {
    const secret = process.env.CSRF_SECRET;
    
    if (!secret) {
      // Generate a secure CSRF secret if not provided
      return crypto.randomBytes(32).toString('hex');
    }

    if (secret.length < 16) {
      throw new Error('CSRF_SECRET must be at least 16 characters long');
    }

    return secret;
  }

  /**
   * Get encryption key for sensitive data
   */
  private getEncryptionKey(): string {
    const key = process.env.ENCRYPTION_KEY;
    
    if (!key) {
      // Generate a secure encryption key if not provided
      return crypto.randomBytes(32).toString('hex');
    }

    if (key.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
    }

    return key;
  }

  /**
   * Validate all secrets meet security requirements
   */
  private validateSecrets(): void {
    const { jwtSecret, csrfSecret, encryptionKey } = this.secrets!;

    // Check for common weak patterns
    const weakPatterns = [
      'password', 'secret', 'key', 'admin', 'test', 'dev', 'prod',
      'jwt', 'token', 'auth', 'login', 'user', '123', 'abc'
    ];

    const allSecrets = [jwtSecret, csrfSecret, encryptionKey].join(' ').toLowerCase();
    
    for (const pattern of weakPatterns) {
      if (allSecrets.includes(pattern)) {
        console.warn(`⚠️  Warning: Secret may contain weak pattern: ${pattern}`);
      }
    }

    // Check entropy
    const entropy = this.calculateEntropy(jwtSecret);
    if (entropy < 3.5) {
      console.warn(`⚠️  Warning: JWT_SECRET entropy is low (${entropy.toFixed(2)}). Consider using a more random secret.`);
    }

    console.log('✅ All secrets validated successfully');
  }

  /**
   * Calculate entropy of a string
   */
  private calculateEntropy(str: string): number {
    const charCount: { [key: string]: number } = {};
    for (const char of str) {
      charCount[char] = (charCount[char] || 0) + 1;
    }

    let entropy = 0;
    const len = str.length;
    
    for (const count of Object.values(charCount)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  /**
   * Generate hash for secret validation
   */
  private generateSecretHash(): string {
    const { jwtSecret, csrfSecret, encryptionKey } = this.secrets!;
    const combined = `${jwtSecret}:${csrfSecret}:${encryptionKey}`;
    return createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Log secret status (without exposing secrets)
   */
  private logSecretStatus(): void {
    const { jwtSecret, csrfSecret, encryptionKey } = this.secrets!;
    
    console.log('🔐 Secret Management Status:');
    console.log(`   JWT Secret: ${jwtSecret.length} chars (${this.calculateEntropy(jwtSecret).toFixed(2)} entropy)`);
    console.log(`   CSRF Secret: ${csrfSecret.length} chars`);
    console.log(`   Encryption Key: ${encryptionKey.length} chars`);
    console.log(`   Secret Hash: ${this.secretHash?.substring(0, 8)}...`);
    
    // Check if secrets are from environment
    console.log(`   JWT_SECRET from env: ${!!process.env.JWT_SECRET}`);
    console.log(`   CSRF_SECRET from env: ${!!process.env.CSRF_SECRET}`);
    console.log(`   ENCRYPTION_KEY from env: ${!!process.env.ENCRYPTION_KEY}`);
  }

  /**
   * Get current secrets
   */
  getSecrets(): SecretConfig {
    if (!this.secrets) {
      throw new Error('Secrets not initialized. Call initialize() first.');
    }
    return this.secrets;
  }

  /**
   * Get JWT secret
   */
  getJWTSecretValue(): string {
    return this.getSecrets().jwtSecret;
  }

  /**
   * Get CSRF secret
   */
  getCSRFSecretValue(): string {
    return this.getSecrets().csrfSecret;
  }

  /**
   * Get encryption key
   */
  getEncryptionKeyValue(): string {
    return this.getSecrets().encryptionKey;
  }

  /**
   * Validate current secrets against stored hash
   */
  validateCurrentSecrets(): boolean {
    if (!this.secretHash) {
      return false;
    }

    const currentHash = this.generateSecretHash();
    return currentHash === this.secretHash;
  }

  /**
   * Generate a secure random secret
   */
  static generateSecureSecret(length: number = 64): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a secure JWT secret
   */
  static generateJWTSecret(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Check if running in production
   */
  static isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Get environment-specific recommendations
   */
  static getRecommendations(): string[] {
    const recommendations: string[] = [];

    if (!process.env.JWT_SECRET) {
      recommendations.push('Set JWT_SECRET environment variable');
    }

    if (!process.env.CSRF_SECRET) {
      recommendations.push('Set CSRF_SECRET environment variable (optional, will auto-generate)');
    }

    if (!process.env.ENCRYPTION_KEY) {
      recommendations.push('Set ENCRYPTION_KEY environment variable (optional, will auto-generate)');
    }

    if (SecretManager.isProduction()) {
      recommendations.push('Use a secrets management service in production');
      recommendations.push('Rotate secrets regularly');
      recommendations.push('Monitor secret access and usage');
    }

    return recommendations;
  }
}

// Create singleton instance
export const secretManager = SecretManager.getInstance();

// Export utility functions
export const generateSecureSecret = SecretManager.generateSecureSecret;
export const generateJWTSecret = SecretManager.generateJWTSecret;
export const isProduction = SecretManager.isProduction;
export const getRecommendations = SecretManager.getRecommendations;

export default secretManager; 