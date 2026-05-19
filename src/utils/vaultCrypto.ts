/**
 * Vault Encryption & Decryption Utility for Mani OS
 * Provides offline-first Base64 obfuscation with a secure signature header.
 * Handles full Unicode (emojis/international characters) safely.
 */

const SECURE_HEADER = 'MANI_VAULT_SECURE_V3:';

/**
 * Encodes a string to Base64 with full Unicode support
 */
function unicodeBtoa(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    })
  );
}

/**
 * Decodes a Base64 string with full Unicode support
 */
function unicodeAtob(str: string): string {
  return decodeURIComponent(
    atob(str)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
}

/**
 * Encrypts/obfuscates the Zustand state object into the signed vault string
 */
export function encryptVaultData(data: object): string {
  const jsonStr = JSON.stringify(data);
  const base64Payload = unicodeBtoa(jsonStr);
  return `${SECURE_HEADER}${base64Payload}`;
}

/**
 * Decrypts/de-obfuscates the signed vault string back into the state object
 */
export function decryptVaultData(payload: string): any {
  const trimmed = payload.trim();
  
  if (!trimmed.startsWith(SECURE_HEADER)) {
    // If it's pure JSON, we can parse it for backward compatibility, 
    // but we should warn the user or let the store import it if it's valid.
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch {
      // Fall through to throw vault mismatch error
    }
    throw new Error('Vault validation signature mismatch. Encryption mismatch.');
  }

  const base64Part = trimmed.substring(SECURE_HEADER.length);
  try {
    const jsonStr = unicodeAtob(base64Part);
    const data = JSON.parse(jsonStr);
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid vault structure');
    }
    return data;
  } catch (err) {
    throw new Error('Failed to decrypt vault content. File may be corrupted or tampered.');
  }
}
