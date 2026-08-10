/** LEGACY / SCRAPPED — thesis/receipts product. Do not ship or revive. */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const FORBIDDEN = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/;
const LINK = /(?:https?:\/\/|www\.)/i;
const CONFIDENCE = new Set([55, 65, 75, 85, 95]);

const text = (value, max, name) => {
  if (typeof value !== 'string') throw new TypeError(`${name} must be text`);
  const clean = value.replace(/\r\n?/g, '\n').normalize('NFC').trim();
  if (!clean || [...clean].length > max) throw new RangeError(`${name} must be 1–${max} characters`);
  if (FORBIDDEN.test(clean) || LINK.test(clean)) throw new RangeError(`${name} contains unsupported content`);
  return clean;
};

export function canonicalizeReceiptInput(input, now = new Date()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('receipt must be an object');
  const assetId = text(input.assetId, 44, 'assetId');
  if (!ADDRESS.test(assetId)) throw new RangeError('assetId must be an address-shaped Solana mint');
  if (!CONFIDENCE.has(input.confidence)) throw new RangeError('confidence must be 55, 65, 75, 85, or 95');
  if (typeof input.resolutionDate !== 'string' || !ISO_DATE.test(input.resolutionDate)) throw new RangeError('resolutionDate must be YYYY-MM-DD');
  const resolution = new Date(`${input.resolutionDate}T23:59:59.999Z`);
  if (Number.isNaN(resolution.valueOf()) || resolution.toISOString().slice(0, 10) !== input.resolutionDate || resolution < now || resolution > new Date(now.valueOf() + 90 * 864e5)) throw new RangeError('resolutionDate must be within 90 days');
  return Object.freeze({
    schemaVersion: 1,
    assetKind: 'solana_mint',
    assetId,
    thesis: text(input.thesis, 280, 'thesis'),
    invalidation: text(input.invalidation, 180, 'invalidation'),
    confidence: input.confidence,
    resolutionDate: input.resolutionDate,
  });
}

export function createReceipt(input, now = new Date()) {
  const original = canonicalizeReceiptInput(input, now);
  const receivedAt = now.toISOString();
  const canonicalPayload = JSON.stringify([original.schemaVersion, original.assetKind, original.assetId, original.thesis, original.invalidation, original.confidence, original.resolutionDate, receivedAt]);
  const manageToken = randomBytes(32).toString('base64url');
  return {
    record: Object.freeze({
      id: randomBytes(16).toString('base64url'),
      ...original,
      receivedAt,
      payloadHash: createHash('sha256').update(canonicalPayload).digest('hex'),
      manageTokenHash: createHash('sha256').update(manageToken).digest('hex'),
    }),
    manageToken,
    canonicalPayload,
  };
}

export function verifyManagementSecret(secret, storedHash) {
  if (typeof secret !== 'string' || typeof storedHash !== 'string' || !/^[0-9a-f]{64}$/.test(storedHash)) return false;
  const actual = createHash('sha256').update(secret).digest();
  return timingSafeEqual(actual, Buffer.from(storedHash, 'hex'));
}
