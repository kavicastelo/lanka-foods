import crypto from 'node:crypto';

const DEFAULT_SECRET_FALLBACK = 'lankaeats-default-wolt-encryption-key-32b!';

function getEncryptionKey(customKey?: string): Buffer {
  const keySource = customKey || process.env.WOLT_TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET || DEFAULT_SECRET_FALLBACK;
  return crypto.createHash('sha256').update(keySource).digest();
}

/**
 * Encrypts a sensitive string (such as access or refresh tokens) using AES-256-GCM.
 * Never stores or returns plaintext tokens.
 */
export function encryptToken(plainText: string, customKey?: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey(customKey);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an AES-256-GCM encrypted token.
 */
export function decryptToken(encryptedPayload: string, customKey?: string): string {
  if (!encryptedPayload) return '';
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }

  const [ivHex, authTagHex, cipherTextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const cipherText = Buffer.from(cipherTextHex, 'hex');
  const key = getEncryptionKey(customKey);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Generates a tamper-proof, time-limited OAuth CSRF state parameter.
 */
export function generateOAuthState(restaurantId: string, secret?: string): string {
  const hmacKey = secret || process.env.JWT_SECRET || DEFAULT_SECRET_FALLBACK;
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(8).toString('hex');
  const payload = `${restaurantId}.${timestamp}.${nonce}`;

  const hmac = crypto.createHmac('sha256', hmacKey).update(payload).digest('hex');
  return Buffer.from(`${payload}.${hmac}`).toString('base64url');
}

/**
 * Verifies an OAuth CSRF state parameter and extracts restaurantId.
 * Max validity: 15 minutes.
 */
export function verifyOAuthState(state: string, secret?: string): { valid: boolean; restaurantId?: string; error?: string } {
  try {
    if (!state) return { valid: false, error: 'Missing state parameter' };
    const decoded = Buffer.from(state, 'base64url').toString('utf8');
    const parts = decoded.split('.');
    if (parts.length !== 4) {
      return { valid: false, error: 'Malformed state parameter' };
    }

    const [restaurantId, timestampStr, nonce, receivedHmac] = parts;
    const hmacKey = secret || process.env.JWT_SECRET || DEFAULT_SECRET_FALLBACK;
    const payload = `${restaurantId}.${timestampStr}.${nonce}`;

    const expectedHmac = crypto.createHmac('sha256', hmacKey).update(payload).digest('hex');
    const hmacBuffer = Buffer.from(receivedHmac, 'hex');
    const expectedBuffer = Buffer.from(expectedHmac, 'hex');

    if (hmacBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(hmacBuffer, expectedBuffer)) {
      return { valid: false, error: 'Invalid state signature' };
    }

    const timestamp = parseInt(timestampStr, 10);
    const fifteenMinutes = 15 * 60 * 1000;
    if (Date.now() - timestamp > fifteenMinutes) {
      return { valid: false, error: 'OAuth state has expired' };
    }

    return { valid: true, restaurantId };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Error verifying state' };
  }
}

/**
 * Verifies Wolt Drive webhook signatures (HMAC SHA-256 or constant-time comparison).
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | undefined,
  secretKey: string
): boolean {
  if (!signatureHeader || !secretKey) {
    return false;
  }

  try {
    const cleanHeader = signatureHeader.replace(/^sha256=/, '').trim();
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(rawBody);
    const calculatedSignature = hmac.digest('hex');

    const expectedBuf = Buffer.from(calculatedSignature, 'hex');
    const receivedBuf = Buffer.from(cleanHeader, 'hex');

    if (expectedBuf.length !== receivedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}
