import QRCode from "qrcode";
import path from "path";
import fs from "fs";
import { uploadQRCodeToCloudinary } from "../utils/clodinary.js";

async function generateQRCode(data) {
  try {
    const qrString = JSON.stringify(data);
    const qrCodeUrl = await QRCode.toDataURL(qrString);
    const result = await uploadQRCodeToCloudinary(qrCodeUrl);
    if (!result.success) {
      return { success: false, error: result.error };
    } else {
      return { success: true, data: result.data };
    }
  } catch (err) {
    console.log(err);
    return { success: false, error: err };
  }
}

async function generateQRForUser(user, event) {
  try {
    const data = {
      eventId: event.id,
      userId: user.id,
    };
    const result = await generateQRCode(data);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, data: result.data };
  } catch (err) {
    return { success: false, error: err };
  }
}

async function generateQRCodeAndUpload(specificId) {
  try {
    // 1. Define the URL that will be encoded
    const domain = "https://your-domain.com"; // replace with your actual domain
    const qrUrl = `${domain}/${specificId}`;

    // 2. Define a temporary local file path
    const fileName = `qr_${specificId}.png`;
    const outputPath = path.join("./public/temp", fileName);

    // Ensure folder exists
    if (!fs.existsSync("./public/temp")) {
      fs.mkdirSync("./public/temp", { recursive: true });
    }

    // 3. Generate QR PNG and save locally
    await QRCode.toFile(outputPath, qrUrl, {
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
      width: 300,
    });

    // 4. Upload the QR PNG to Cloudinary
    const result = await uploadQRCodeToCloudinary(outputPath);

    console.log(result)

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // 5. Delete the local file after successful upload
    fs.unlinkSync(outputPath);

    // 6. Return Cloudinary URL + original encoded URL
    return {
      success: true,
      cloudinaryUrl: result.data,
      qrContentUrl: qrUrl,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export { generateQRForUser, generateQRCodeAndUpload };