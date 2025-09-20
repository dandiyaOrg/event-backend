import CryptoJS from "crypto-js";

// Generate key using PBKDF2 (similar to scryptSync)
const secretKey = CryptoJS.PBKDF2(process.env.PASSWORD_ENCRYPTION_KEY, "salt", {
  keySize: 256 / 32, // 32 bytes = 256 bits
  iterations: 100000, // Higher iterations for better security
});

const ivLength = 16;

const encryptPassword = (password) => {
  // Generate random IV (16 bytes)
  const iv = CryptoJS.lib.WordArray.random(ivLength);

  // Encrypt the password
  const encrypted = CryptoJS.AES.encrypt(password, secretKey, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // Convert IV and encrypted text to hex and combine
  const ivHex = CryptoJS.enc.Hex.stringify(iv);
  const encryptedHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);

  return ivHex + ":" + encryptedHex;
};

const decryptPassword = (encrypted) => {
  const [ivHex, encryptedText] = encrypted.split(":");

  // Convert hex strings back to WordArray
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const encryptedData = CryptoJS.enc.Hex.parse(encryptedText);

  // Create cipher params object
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: encryptedData,
  });

  // Decrypt the password
  const decrypted = CryptoJS.AES.decrypt(cipherParams, secretKey, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // Convert to UTF-8 string
  return decrypted.toString(CryptoJS.enc.Utf8);
};

export { encryptPassword, decryptPassword };
