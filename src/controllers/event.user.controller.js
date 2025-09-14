import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import prisma from "../db/config.js";
import { generateQRForUser } from "../services/qrGenerator.service.js";
import {
  registerPhoneNo,
  sendWhatsappMsg,
} from "../services/whatsapp.service.js";

const userEventRegistration = asyncHandler(async (req, res, next) => {
  try {
    const phoneRegex = /^(\d{10}|\d{11})$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const { eventId } = req.params;
    if (!eventId) return next(new ApiError(400, "Event Id is required"));
    const { formValues } = req.body;
    console.log(formValues);
    console.log(typeof formValues);
    let { modeOfRegistration } = req.body;
    if (!formValues)
      return next(new ApiError(400, "FormValue Field is required"));
    modeOfRegistration = modeOfRegistration || "ONLINE";

    const eventDetail = await prisma.event.findUnique({
      where: { id: parseInt(eventId) },
    });
    if (!eventDetail)
      return next(
        new ApiError(404, "Cannot get eventdetails as per given eventId")
      );
    let parsedformValues;
    try {
      parsedformValues = JSON.parse(formValues);
    } catch (error) {
      return next(new ApiError(400, "Invalid JSON for Form Values", error));
    }
    console.log(parsedformValues);
    console.log(typeof parsedformValues);
    let phoneNo, email, userName;

    Object.keys(parsedformValues).forEach((key) => {
      switch (parsedformValues[key].name) {
        case "phone_input_0A6EEDDB-E0D5-4BC7-8D4B-CF2D4896B786":
          phoneNo = parsedformValues[key].value;
          break;
        case "email_input_A4A11559-34CB-4A95-BB86-E89C8CABE06C":
          email = parsedformValues[key].value;
          break;
        case "text_input_103DC733-9828-4C8D-BDD5-E2BCDD96D92A":
          userName = parsedformValues[key].value;
          break;
        default:
          break;
      }
    });

    if (!(userName && email && phoneNo))
      return next(new ApiResponse(400, "Cannot get required fields"));
    if (userName.length == 0 || email.length == 0 || phoneNo.length == 0)
      return next(
        new ApiError(400, "Length of field should be greater than 0")
      );
    if (!phoneRegex.test(phoneNo)) {
      return next(
        new ApiError(
          400,
          "Invalid phone number. It should be 10 digits or 11 digits starting with 0."
        )
      );
    }
    if (!emailRegex.test(email)) {
      return next(new ApiError(400, "Invalid email format."));
    }

    phoneNo = phoneNo.toString();
    if (phoneNo.at(0) === "0") {
      phoneNo = phoneNo.substring(1, phoneNo.length);
    }
    const existerUser = await prisma.eventRegistration.findFirst({
      where: {
        AND: [{ eventId: eventDetail.id }, { phoneNo }],
      },
    });
    console.log(existerUser);
    if (existerUser) {
      return next(new ApiError(409, "User Already registered in the event"));
    }
    const userDetail = await prisma.eventRegistration.create({
      data: {
        eventId: eventDetail.id,
        userName: userName,
        phoneNo: phoneNo,
        modeOfRegistration,
        email: email,
        formValues: parsedformValues,
      },
    });
    console.log(userDetail);
    if (!userDetail)
      return next(
        new ApiError(500, "Server Error while registering user to event")
      );
    const result = await generateQRForUser(userDetail, eventDetail);
    if (!result.success)
      return next(
        new ApiError(500, "Error in generating QR code for user ", result.error)
      );
    const user = await prisma.eventRegistration.update({
      where: { id: parseInt(userDetail.id) },
      data: { QR: result.data },
    });

    //the user's phone no should be paste there
    const validatePhone = await registerPhoneNo(userName, parseInt(phoneNo));

    if (!validatePhone.success) {
      return next(
        new ApiError(
          500,
          "Error while validation phone no ",
          validatePhone.error
        )
      );
    }

    //this would be user's phone no
    const whatsappData = {
      QR: result.data,
      userName: user.userName,
      name: eventDetail.eventName,
      startDate: eventDetail.startDate,
      endDate: eventDetail.endDate,
      address: eventDetail.address,
      city: eventDetail.city,
    };
    const sendmsg = await sendWhatsappMsg(whatsappData, parseInt(phoneNo));
    if (!sendmsg.success) {
      return next(
        new ApiError(500, "Error sending whatsapp message", sendmsg.error)
      );
    }
    return res
      .status(201)
      .json(
        new ApiResponse(201, user, "User registered to the event successfully")
      );
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const getAllEvents = asyncHandler(async (req, res, next) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        status: "ACTIVE",
      },
    });
    if (!events || events.length == 0)
      return next(new ApiError(404, "No Active Events Found"));
    for (let event of events) {
      event.eventTemplate = JSON.stringify(event.eventTemplate);
    }
    return res
      .status(200)
      .json(new ApiResponse(200, events, "Events Fetched Successfully"));
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const getEventById = asyncHandler(async (req, res, next) => {
  try {
    const { eventId } = req.params;
    if (!eventId) return next(new ApiError(400, "Event Id is required"));
    const event = await prisma.event.findUnique({
      where: { id: parseInt(eventId), status: "ACTIVE" },
    });

    if (!event) return next(new ApiError(404, "No such event exist"));
    try {
      event.eventTemplate = JSON.stringify(event.eventTemplate);
    } catch (error) {
      return next(
        new ApiError(500, "Error Cannot parse the data to string", error)
      );
    }
    return res
      .status(200)
      .json(new ApiResponse(200, event, "Event fetched successfully"));
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const markUserJourney = asyncHandler(async (req, res, next) => {
  try {
    const { action, userId, eventId } = req.body;
    if (!(action && userId && eventId))
      return next(new ApiError(400, "All UserJourney fields are required"));
    const data = await prisma.userJourney.findFirst({
      where: { eventId, userId, action },
    });
    if (data) return next(new ApiError(401, `${action} Already Marked True`));
    const userJourney = await prisma.userJourney.create({
      data: {
        userId: parseInt(userId),
        eventId: parseInt(eventId),
        action,
        value: true,
      },
    });
  } catch (err) {
    return next(new ApiError(500, "Internal Server Error", err));
  }
});
export { userEventRegistration, getAllEvents, getEventById };
