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

async function generateQR(params = {}) {
  try {
    // Build payload (stringify or any format you prefer)
    const qrPayload = JSON.stringify(params);

    // Generate QR code options
    const qrOptions = {
      type: "image/png",
      width: 250, // pixel size of the QR code image (adjustable)
      margin: 2,
      color: {
        dark: "#000000", // QR code black color
        light: "#ffffff", // Background color white
      },
      errorCorrectionLevel: "H", // High error correction (~30% damage)
    };

    // Generate Data URL (base64 PNG image)
    const qrImageDataUrl = await QRCode.toDataURL(qrPayload, qrOptions);

    return {
      success: true,
      data: qrPayload,
      image: qrImageDataUrl,
    };
  } catch (error) {
    console.error("Error generating QR code:", error);
    return { success: false, error: error };
  }
}

export { generateQRCodeAndUpload, generateQR };
