import QRCode from "qrcode";
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

export { generateQRForUser };
