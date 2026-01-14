/**
 * Security Utility for Password Hashing using SHA-256
 * This ensures passwords are never stored in plain text.
 */

const PEPPER = "T1T_SYSTEM_SECURE_2026_!@#"; // Secret key known only to the app

export const hashPassword = async (password) => {
  if (!password) return '';
  
  const saltedPassword = password + PEPPER;

  // Fallback for non-secure contexts (Mobile HTTP)
  if (!window.crypto || !window.crypto.subtle) {
    console.warn("Security Alert: crypto.subtle is not available. Using JS Fallback.");
    // Simple but consistent hash for local testing on mobile
    let hash = 0;
    for (let i = 0; i < saltedPassword.length; i++) {
        const char = saltedPassword.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return 'fallback_' + Math.abs(hash).toString(16);
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(saltedPassword);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
};

/**
 * Checks if a string looks like an SHA-256 hash.
 * This helps in detecting if a password needs migration to hashed format.
 */
export const isHashed = (str) => {
  return /^[a-f0-9]{64}$/.test(str);
};
