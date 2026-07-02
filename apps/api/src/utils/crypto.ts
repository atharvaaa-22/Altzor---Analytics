import crypto from 'crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function deriveKey(): Buffer {
  return crypto
    .createHash('sha256')
    .update(env.JWT_SECRET)
    .digest();
}

export interface EncryptedData {
  ciphertext: string; // hex
  iv: string;         // hex
  tag: string;        // hex
}

export function encrypt(plaintext: string): EncryptedData {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

export function decrypt(data: EncryptedData): string {
  const key = deriveKey();
  const iv = Buffer.from(data.iv, 'hex');
  const tag = Buffer.from(data.tag, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(data.ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
