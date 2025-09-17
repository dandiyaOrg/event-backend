import QRCode from "qrcode";
import path from "path";
import fs from "fs";
import { uploadOnCloudinary } from "../utils/clodinary.js";

async function generateQRCodeAndUpload(eventId) {
  try {
    const domain = "https://your-domain.com";
    const qrUrl = `${domain}/${eventId}`;

    const fileName = `qr_${eventId}.png`;
    const outputPath = path.join("./public/temp", fileName);

    // Ensure folder exists
    if (!fs.existsSync("./public/temp")) {
      fs.mkdirSync("./public/temp", { recursive: true });
    }

    await QRCode.toFile(outputPath, qrUrl, {
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
      width: 300,
    });
    const result = await uploadOnCloudinary(outputPath);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    fs.unlinkSync(outputPath);
    return {
      success: true,
      cloudinaryUrl: result.data,
      qrContentUrl: qrUrl,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export { generateQRCodeAndUpload };
