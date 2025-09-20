import { decryptPassword } from "../utils/encrypt.js";

const HARD_CODED_CLIENT_TOKEN = "hP9Xm2VkufL8TqzYbOW4neCRg";
const HARD_CODED_ENCRYPTED_TOKEN =
  "987acc957cc48535070602547d7f6a96:e217e98ab8cf07f27d3d2ec8745a018c32c5001af9cadb8bfbb5b04de299f706";

const checkClientToken = (req, res, next) => {
  const headerToken = req.get("X-Client-Token");
  if (!headerToken) {
    return res.status(403).json({ message: "Client token missing" });
  }
  let decoded;
  try {
    decoded = decryptPassword(headerToken);
  } catch (err) {
    console.error("Token decryption/validation error:", err);
    return res.status(403).json({ message: "Invalid client token" });
  }

  if (decoded !== HARD_CODED_CLIENT_TOKEN) {
    return res.status(403).json({ message: "Client token invalid" });
  }

  next();
};

export { checkClientToken };
