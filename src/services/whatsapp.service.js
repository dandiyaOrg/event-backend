import axios from "axios";
import { formatDateTime } from "./dateconversion.service.js";

const registerPhoneNo = async (name, phoneNumber) => {
  try {
    const url = "https://api.interakt.ai/v1/public/track/users/";
    const data = {
      phoneNumber,
      countryCode: "+91",
      traits: {
        name,
      },
    };
    const response = await axios.post(url, data, {
      headers: {
        Authorization: `Basic ${process.env.WHATSAPP_API}`,
        "Content-Type": "applicaton/json",
      },
    });
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error };
  }
};

const sendWhatsappMsg = async (eventData, phoneNumber) => {
  try {
    const url = "https://api.interakt.ai/v1/public/message/";
    const startDate = formatDateTime(eventData.startDate);
    const endDate = formatDateTime(eventData.endDate);
    const data = {
      countryCode: "+91",
      phoneNumber,
      callbackData: "some text here",
      type: "Template",
      template: {
        name: "anginatevent",
        languageCode: "en_US",
        headerValues: [eventData.QR],
        bodyValues: [
          eventData.userName,
          eventData.name,
          startDate,
          endDate,
          eventData.address,
        ],
      },
    };
    const response = await axios.post(url, data, {
      headers: {
        Authorization: `Basic ${process.env.WHATSAPP_API}`,
        "Content-Type": "applicaton/json",
      },
    });
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error };
  }
};

export { sendWhatsappMsg, registerPhoneNo };
