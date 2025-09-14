// import { ApiResponse } from "../utils/ApiResponse.js";
// import { asyncHandler } from "../utils/asyncHandler.js";
// import { ApiError } from "../utils/ApiError.js";
// import prisma from "../db/config.js";
// import { uploadOnCloudinary } from "../utils/clodinary.js";

// const registerEvent = asyncHandler(async (req, res, next) => {
//   try {
//     const {
//       eventName,
//       isPaid,
//       address,
//       startDate,
//       endDate,
//       userJourney,
//       eventTemplate,
//       attendieType,
//     } = req.body;
//     const fields = [
//       eventName,
//       isPaid,
//       address,
//       startDate,
//       endDate,
//       userJourney,
//       eventTemplate,
//       attendieType,
//     ];

//     if (fields.some((field) => field === undefined)) {
//       return next(new ApiError(400, "All fields are required"));
//     }
//     if (!Date.parse(startDate) || !Date.parse(endDate)) {
//       return next(new ApiError(400, "Invalid date formats"));
//     }

//     if (new Date(startDate) < new Date())
//       return next(
//         new ApiError(400, "Event Start date should be greater then today'date")
//       );

//     let parsedEventTemplate;
//     try {
//       parsedEventTemplate = JSON.parse(eventTemplate);
//     } catch (error) {
//       return next(new ApiError(400, "Invalid JSON for Event Template", error));
//     }
//     let parsedUserJourney;
//     try {
//       parsedUserJourney = JSON.parse(userJourney);
//     } catch (error) {
//       return next(new ApiError(400, "Invalid JSON for User Journey", error));
//     }
//     let parsedAttendieType;
//     try {
//       parsedAttendieType = JSON.parse(attendieType);
//     } catch (error) {
//       return next(new ApiError(400, "Invalid JSON for Attendie Type", error));
//     }
//     const designlocalpath = req.file?.buffer;
//     let design;
//     if (designlocalpath) {
//       try {
//         const a = await uploadOnCloudinary(designlocalpath);
//         design = a.url;
//       } catch (error) {
//         return next(
//           new ApiError(500, "Error on uploading design on clodinary", error)
//         );
//       }
//     } else {
//       design = null;
//     }
//     console.log(req.user);
//     const event = await prisma.event.create({
//       data: {
//         eventName,
//         isPaid: Boolean(isPaid),
//         address,
//         startDate: new Date(startDate),
//         endDate: new Date(endDate),
//         design: design,
//         userJourney: parsedUserJourney,
//         eventTemplate: parsedEventTemplate,
//         attendieType: parsedAttendieType,
//         admin: {
//           connect: {
//             id: parseInt(req.user?.id),
//           },
//         },
//       },
//     });

//     if (!event) return next(new ApiError(500, "Error in creating event"));
//     try {
//       event.eventTemplate = JSON.stringify(event.eventTemplate);
//     } catch (error) {
//       return next(
//         new ApiError(500, "Error Cannot parse the data to string", error)
//       );
//     }
//     return res
//       .status(201)
//       .json(new ApiResponse(201, event, "Event Created Successfully"));
//   } catch (error) {
//     return next(new ApiError(500, "Internal Server Error", error));
//   }
// });

// const getAllCreatedEvents = asyncHandler(async (req, res, next) => {
//   try {
//     const user = req.user;
//     const { status } = req.query;
//     if (!user)
//       return next(new ApiError(401, "User Authentication is required"));
//     const events = await prisma.event.findMany({
//       where: { adminId: user.id, status },
//     });
//     if (!events || !events.length)
//       return next(new ApiError(404, "No Events Found"));
//     for (let event of events) {
//       event.eventTemplate = JSON.stringify(event.eventTemplate);
//     }
//     return res
//       .status(200)
//       .json(new ApiResponse(200, events, "Events fetched successfully"));
//   } catch (error) {
//     return next(new ApiError(500, "Internal Server Error", error));
//   }
// });
// const getEventDetails = asyncHandler(async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     if (!id) return next(new ApiError(400, "Event Id is required"));
//     const event = await prisma.event.findUnique({
//       where: { id: parseInt(id) },
//     });
//     if (!event) return next(new ApiError(404, "Event not found"));
//     try {
//       event.eventTemplate = JSON.stringify(event.eventTemplate);
//     } catch (error) {
//       return next(
//         new ApiError(500, "Error Cannot parse the data to string", error)
//       );
//     }
//     return res
//       .status(200)
//       .json(new ApiResponse(200, event, "Event details fetched successfully"));
//   } catch (error) {
//     return next(new ApiError(500, "Internal Server Error", error));
//   }
// });

// const deleteEvent = asyncHandler(async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     if (!id) return next(new ApiError(400, "Event Id is required"));
//     const event = await prisma.event.findUnique({
//       where: { id: parseInt(id) },
//     });
//     if (!event) {
//       return next(new ApiError(404, "Event Not Found"));
//     }
//     await prisma.event.delete({ where: { id: parseInt(id) } });
//     return res
//       .status(200)
//       .json(new ApiResponse(200, {}, "Event deleted successfully"));
//   } catch (error) {
//     return next(new ApiError(500, "Internal Server Error", error));
//   }
// });
// const updateEvent = asyncHandler(async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     if (!id) return next(new ApiError(400, "Event Id is required"));
//     const event = await prisma.event.findUnique({
//       where: { id: parseInt(id) },
//     });
//     if (!event) {
//       return next(new ApiError(404, "Event Not Found"));
//     }
//     let updateinfo = {};

//     const {
//       eventName,
//       isPaid,
//       address,
//       startDate,
//       endDate,
//       userJourney,
//       eventTemplate,
//       attendieType,
//     } = req.body;
//     if (eventName) updateinfo["eventName"] = eventName;
//     if (isPaid !== undefined) updateinfo["isPaid"] = Boolean(isPaid);
//     if (address) updateinfo["address"] = address;
//     if (startDate) {
//       updateinfo["startDate"] = new Date(startDate);
//       updateinfo["endDate"] = new Date(endDate);
//       if (updateinfo.startDate > new Date()) updateinfo["status"] = "ACTIVE";
//     }

//     if (userJourney) {
//       try {
//         const parsedUserJourney = JSON.parse(userJourney);
//         updateinfo["userJourney"] = parsedUserJourney;
//       } catch (err) {
//         return next(new ApiError(400, "Invalid JSON for User Journey", err));
//       }
//     }
//     if (eventTemplate) {
//       try {
//         const parsedEventTemplate = JSON.parse(eventTemplate);
//         updateinfo["eventTemplate"] = parsedEventTemplate;
//       } catch (error) {
//         return next(
//           new ApiError(400, "Invalid JSON for Event Template", error)
//         );
//       }
//     }

//     if (attendieType) {
//       try {
//         const parsedAttendieType = JSON.parse(attendieType);
//         updateinfo["attendieType"] = parsedAttendieType;
//       } catch (error) {
//         return next(new ApiError(400, "Invalid JSON for Attendie Type", error));
//       }
//     }

//     if (Object.keys(updateinfo).length === 0)
//       return next(new ApiError(400, "Give atleast one of the parameters"));

//     const updatedevent = await prisma.event.update({
//       where: { id: parseInt(id) },
//       data: updateinfo,
//     });
//     try {
//       updatedevent.eventTemplate = JSON.stringify(updatedevent.eventTemplate);
//     } catch (error) {
//       return next(
//         new ApiError(500, "Error Cannot parse the data to string", error)
//       );
//     }

//     return res
//       .status(200)
//       .json(new ApiResponse(200, updatedevent, "Updated Successfully"));
//   } catch (error) {
//     return next(new ApiError(500, "Internal Server Error", error));
//   }
// });

// const getAllEventRegsiteredUser = asyncHandler(async (req, res, next) => {
//   try {
//     const { eventId } = req.params;
//     if (!eventId) return next(new ApiError(400, "Event Id is required"));
//     const event = await prisma.event.findUnique({
//       where: { id: parseInt(eventId) },
//     });
//     if (!event) return next(new ApiError(404, "Event Not Found"));
//     const eventRegisteredUsers = await prisma.eventRegistration.findMany({
//       where: { eventId: parseInt(eventId) },
//     });
//     if (!eventRegisteredUsers.length)
//       return next(
//         new ApiError(404, "No registered users found for this event")
//       );

//     return res
//       .status(200)
//       .json(
//         new ApiResponse(200, eventRegisteredUsers, "Users fetched successfully")
//       );
//   } catch (error) {
//     return next(new ApiError(500, "Internal Server Error", error));
//   }
// });
// export {
//   registerEvent,
//   getEventDetails,
//   deleteEvent,
//   updateEvent,
//   getAllEventRegsiteredUser,
//   getAllCreatedEvents,
// };
