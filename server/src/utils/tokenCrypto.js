const crypto = require('crypto');
const config = require('../config');

// I encrypt Gmail OAuth tokens before they ever touch the database, so a
// database dump alone isn't enough to use someone's Gmail access -- you'd
// also need TOKEN_ENC_KEY, which only lives in server env vars.
//
// AES-256-GCM is authenticated: decrypt() throws if the ciphertext was
// tampered with, instead of silently returning garbage. GCM must never reuse
// an IV under the same key, so I generate a fresh random one per call and
// store it alongside the ciphertext -- there's nothing secret about the IV
// itself, only the key.
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended IV length for GCM

function getKey() {
  const hex = config.tokenEncKey;
  if (!hex) {
    throw new Error('TOKEN_ENC_KEY is not set');
  }
  const key = Buffer.from(hex, 'hex');
  if (key.length !== 32) {
    throw new Error('TOKEN_ENC_KEY must be 32 bytes (64 hex characters)');
  }
  return key;
}

// Returns one string ("iv:authTag:ciphertext", all hex) so callers only ever
// need to persist a single TEXT column.
function encrypt(plaintext) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((buf) => buf.toString('hex')).join(':');
}

function decrypt(stored) {
  const [ivHex, authTagHex, ciphertextHex] = stored.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, 'hex')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

module.exports = { encrypt, decrypt };
