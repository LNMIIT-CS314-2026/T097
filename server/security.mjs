import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}

export function matchesPassword(password, encoded) {
  const [salt, hash] = encoded.split(':');
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(hash, 'hex'));
}

export const tokenDigest = (value) => createHash('sha256').update(value).digest('hex');
export const randomToken = () => randomBytes(32).toString('base64url');
