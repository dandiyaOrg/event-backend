import crypto from "crypto";
const algorithm = "aes-256-cbc";
const secretKey = crypto.scryptSync(
  process.env.PASSWORD_ENCRYPTION_KEY,
  "salt",
  32
);
const ivLength = 16;

const encryptPassword = (password) => {
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  let encrypted = cipher.update(password, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
};

const decryptPassword = (encrypted) => {
  const [ivHex, encryptedText] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

export { encryptPassword, decryptPassword };
