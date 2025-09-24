import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import sendMail from "../utils/sendMail.js";
import { Op } from "sequelize";
import {
  Pass,
  BillingUser,
  SubEvent,
  Admin,
  Event,
  PassSubEvent,
} from "../db/models/index.js";
import {
  uploadOnCloudinary,
  deletefromCloudinary,
} from "../utils/clodinary.js";
import { generateQRCodeAndUpload } from "../services/qrGenerator.service.js";
import { logger } from "../app.js";
import { validate as isUUID } from "uuid";
import { convertToDateOnlyIST } from "../services/dateconversion.service.js";

const registerEvent = asyncHandler(async (req, res, next) => {
  try {
    const {
      event_name,
      description,
      venue,
      google_map_link,
      number_of_days,
      date_start,
      date_end,
      event_type,
    } = req.body;

    if (
      !(
        event_name &&
        description &&
        google_map_link &&
        number_of_days &&
        date_start &&
        date_end &&
        venue &&
        event_type
      )
    ) {
      logger.warn("Missing required event fields in request body");
      return next(
        new ApiError(
          400,
          "Event name, venue, google map link, number of days, start and end date are required fields"
        )
      );
    }

    if (!req.file) {
      logger.warn("Event image not provided");
      return next(new ApiError(400, "Event image is required"));
    }

    const imagelocalPath = req.file.path;
    let imageUrl;
    if (imagelocalPath) {
      try {
        const { success, data, error } =
          await uploadOnCloudinary(imagelocalPath);
        if (!success) {
          logger.error("Failed to upload event image on Cloudinary", { error });
          return next(
            new ApiError(500, "Error on uploading design on clodinary", error)
          );
        }
        imageUrl = data;
        logger.info("Event image uploaded successfully", { imageUrl });
      } catch (error) {
        logger.error("Cloudinary upload exception", { error });
        return next(
          new ApiError(500, "Error on uploading design on clodinary", error)
        );
      }
    } else {
      imageUrl = null;
      logger.info("No event image provided, continuing with null imageUrl");
    }

    // Create the event
    const newEvent = await Event.create({
      event_name,
      description,
      venue,
      google_map_link,
      type_of_event: event_type,
      number_of_days,
      date_start,
      date_end,
      admin_id: req.admin_id,
      event_image: imageUrl,
    });

    if (!newEvent) {
      logger.error("Failed to create event in DB");
      return next(new ApiError(400, "Failed to create event"));
    }
    logger.info("Event created successfully in DB", {
      eventId: newEvent.event_id,
    });

    const qrResult = await generateQRCodeAndUpload(newEvent.event_id);

    if (!qrResult.success) {
      logger.error("QR code generation failed", { error: qrResult.error });
      return next(
        new ApiError(500, "Failed to generate event QR", qrResult.error)
      );
    }

    newEvent.event_qr = qrResult.cloudinaryUrl;
    newEvent.event_url = qrResult.qrContentUrl;

    const updatedEvent = await newEvent.save();

    if (!updatedEvent) {
      logger.error("Failed to save updated event with QR info", {
        eventId: newEvent.event_id,
      });
      return next(new ApiError(400, "Failed to create event"));
    }
    logger.info("Event QR generated and event updated", {
      eventId: updatedEvent.event_id,
      eventUrl: updatedEvent.event_url,
    });

    const admin = await Admin.findByPk(req.admin_id);

    const { emailData, error } = await sendMail(
      admin.email,
      "eventRegistration",
      {
        admin,
        event: updatedEvent,
      }
    );
    if (!emailData) {
      logger.error("Failed to send event registration email", { error });
      return next(
        new ApiError(502, "Failed to send credentials update email", error)
      );
    }

    logger.info("Event created successfully and email sent", {
      eventId: updatedEvent.event_id,
      emailId: emailData,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          201,
          { event: updatedEvent },
          "Event created successfully"
        )
      );
  } catch (error) {
    logger.error("Internal server error during event registration", { error });
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const deleteEvent = asyncHandler(async (req, res, next) => {
  try {
    const { eventId } = req.params;
    if (!eventId) {
      logger.warn("Delete event request without eventId in params");
      return next(new ApiError(400, "Event ID is required in query params"));
    }

    const event = await Event.findByPk(eventId);
    if (!event) {
      logger.warn("Event not found for deletion", { eventId });
      return next(new ApiError(404, "Event not found"));
    }

    const isDeleted = await deletefromCloudinary(
      [event.event_image, event.event_qr],
      "image"
    );

    if (!isDeleted) {
      logger.error("Failed to delete event images from Cloudinary", {
        eventId,
        images: [event.event_image, event.event_qr],
      });
      return next(
        new ApiError(500, "Failed to delete event images from cloud")
      );
    }

    await Event.destroy({
      where: { event_id: eventId },
    });

    logger.info("Event deleted successfully", { eventId });
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Event deleted successfully"));
  } catch (error) {
    logger.error("Internal server error during event deletion", {
      error,
      eventId: req.params?.eventId,
    });
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const getEventDetailById = asyncHandler(async (req, res, next) => {
  try {
    const { eventId } = req.params;

    if (!eventId) {
      logger.warn("getEventDetailById called without eventId");
      return next(new ApiError(400, "Event ID is required in params"));
    }

    const event = await Event.findByPk(eventId);

    if (!event) {
      logger.warn(`Event not found with id ${eventId}`);
      return next(new ApiError(404, `Event with id ${eventId} not found`));
    }

    logger.info("Event fetched successfully", { eventId });
    return res
      .status(200)
      .json(new ApiResponse(200, event, "Event fetched successfully"));
  } catch (error) {
    logger.error("Internal server error in getEventDetailById", {
      error,
      eventId: req.params?.eventId,
    });
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const updateEvent = asyncHandler(async (req, res, next) => {
  try {
    const { eventId } = req.params;
    if (!eventId) {
      logger.warn("updateEvent called without eventId");
      return next(new ApiError(400, "Event ID is required in params"));
    }

    const event = await Event.findByPk(eventId);
    if (!event) {
      logger.warn(`Event not found for update`, { eventId });
      return next(new ApiError(404, `Event with id ${eventId} not found`));
    }

    const {
      event_name,
      description,
      venue,
      google_map_link,
      number_of_days,
      date_start,
      date_end,
      event_type,
    } = req.body;

    let imageUrl;
    if (req.image) {
      const imagelocalPath = req?.file.path;
      if (imagelocalPath) {
        try {
          const { success, data, error } =
            await uploadOnCloudinary(imagelocalPath);
          if (!success) {
            logger.error("Failed to upload updated event image to Cloudinary", {
              eventId,
              error,
            });
            return next(
              new ApiError(
                500,
                "Error on uploading event image on clodinary",
                error
              )
            );
          }
          imageUrl = data;
          logger.info("Updated event image uploaded successfully", {
            eventId,
            imageUrl,
          });
        } catch (error) {
          logger.error("Exception during event image upload", {
            eventId,
            error,
          });
          return next(
            new ApiError(
              500,
              "Error on uploading event image on clodinary",
              error
            )
          );
        }
      } else {
        imageUrl = null;
      }
    }

    const previousImage = event.event_image;
    const updatedEvent = await event.update({
      event_name: event_name ?? event.event_name,
      description: description ?? event.description,
      venue: venue ?? event.venue,
      google_map_link: google_map_link ?? event.google_map_link,
      type_of_event: event_type ?? event.type_of_event,
      number_of_days: number_of_days ?? event.number_of_days,
      date_start: date_start ?? event.date_start,
      date_end: date_end ?? event.date_end,
      event_image: imageUrl ?? previousImage,
    });

    if (imageUrl && previousImage) {
      await deletefromCloudinary([previousImage], "image");
      logger.info("Previous event image deleted from Cloudinary", { eventId });
    }

    logger.info("Event updated successfully", { eventId });
    return res
      .status(200)
      .json(new ApiResponse(200, updatedEvent, "Event updated successfully"));
  } catch (error) {
    logger.error("Internal server error during event update", {
      error,
      eventId: req.params?.eventId,
    });
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const updateEventStatus = asyncHandler(async (req, res, next) => {
  try {
    const { eventId } = req.params;
    if (!eventId) {
      logger.warn("updateEventStatus called without eventId");
      return next(new ApiError(400, "Event ID is required in params"));
    }

    const event = await Event.findByPk(eventId);
    if (!event) {
      logger.warn(`Event not found for status update`, { eventId });
      return next(new ApiError(404, `Event with id ${eventId} not found`));
    }

    const { status } = req.body;
    const updatedEvent = await event.update({
      status: status ?? event.status,
    });

    logger.info("Event status updated successfully", {
      eventId,
      status: updatedEvent.status,
    });
    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedEvent, "Event status updated successfully")
      );
  } catch (error) {
    logger.error("Internal server error during event status update", {
      error,
      eventId: req.params?.eventId,
    });
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const getAllEventByAdmin = asyncHandler(async (req, res, next) => {
  try {
    const admin_id = req.admin_id;
    if (!admin_id) {
      logger.warn("getAllEventByAdmin called without admin_id");
      return next(new ApiError(400, "Admin ID is required"));
    }

    const events = await Event.findAll({
      where: { admin_id },
    });

    if (!events || events.length === 0) {
      logger.warn(`No events found for admin`, { admin_id });
      return next(
        new ApiError(404, `No events found for admin id ${admin_id}`)
      );
    }

    logger.info("Events fetched successfully for admin", {
      admin_id,
      count: events.length,
    });
    return res
      .status(200)
      .json(new ApiResponse(200, events, "Events fetched successfully"));
  } catch (error) {
    logger.error("Internal server error while fetching events for admin", {
      error,
      admin_id: req.admin_id,
    });
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const getAllSubeventsWithPasses = asyncHandler(async (req, res, next) => {
  try {
    const { billingUserId, eventId } = req.body;

    if (!billingUserId) {
      logger.warn("getAllSubeventsWithPasses called without billingUserId");
      return next(new ApiError(400, "Billing User Id is required"));
    }

    const billingUser = await BillingUser.findByPk(billingUserId);
    if (!billingUser) {
      logger.warn(`Billing user not found`, { billingUserId });
      return next(
        new ApiError(404, `Billing user with id ${billingUserId} not found`)
      );
    }

    if (!eventId) {
      logger.warn("getAllSubeventsWithPasses called without eventId");
      return next(new ApiError(400, "Event ID is required"));
    }

    const event = await Event.findByPk(eventId);
    if (!event) {
      logger.warn(`Event not found`, { eventId });
      return next(new ApiError(404, `Event with id ${eventId} not found`));
    }

    const subevents = await SubEvent.findAll({
      where: {
        event_id: eventId,
        is_active: true,
      },
      attributes: [
        "subevent_id",
        "name",
        "description",
        "date",
        "start_time",
        "end_time",
        "day",
        "available_quantity",
        "images",
      ],
      include: [
        {
          model: Pass,
          as: "passes",
          where: { is_active: true },
          required: false,
          attributes: [
            "pass_id",
            "category",
            "total_price",
            "discount_percentage",
            "validity",
            "final_price",
          ],
        },
      ],
      order: [
        ["date", "ASC"],
        ["start_time", "ASC"],
      ],
    });

    const subeventData = subevents.map((subevent) =>
      subevent.get({ plain: true })
    );

    logger.info("Subevents with passes fetched successfully", {
      eventId,
      billingUserId,
      count: subeventData.length,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subeventData,
          `Subevents with passes fetched successfully for event ${eventId}`
        )
      );
  } catch (error) {
    logger.error("Internal server error in getAllSubeventsWithPasses", {
      error,
      billingUserId: req.body?.billingUserId,
      eventId: req.body?.eventId,
    });
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const getGlobalPassForEvent = asyncHandler(async (req, res, next) => {
  try {
    const { billingUserId, eventId } = req.body;

    if (!billingUserId && !isUUID(billingUserId)) {
      logger.warn("getGlobalPassForEvent called without billingUserId");
      return next(new ApiError(400, "Billing User Id is required"));
    }

    if (!eventId && !isUUID(eventId)) {
      logger.warn("getGlobalPassForEvent called without eventId");
      return next(new ApiError(400, "Event ID is required in query params"));
    }

    const event = await Event.findByPk(eventId);
    if (!event) {
      logger.warn("Event not found", { eventId });
      return next(new ApiError(404, `Event with id ${eventId} not found`));
    }

    const subevents = await SubEvent.findAll({
      where: { event_id: eventId },
      attributes: ["subevent_id", "date"],
      order: [["date", "ASC"]],
    });

    if (!subevents || subevents.length === 0) {
      logger.warn("No subevents found for event", { eventId });
      return next(new ApiError(404, "No subevents found for this event"));
    }
    const todayStr = convertToDateOnlyIST(new Date());
    const remainingSubevents = subevents.filter((s) => {
      const seDateStr = s.date ? convertToDateOnlyIST(s.date) : null;
      return seDateStr && seDateStr >= todayStr;
    });

    const remainingIds = remainingSubevents.map((s) => s.subevent_id);

    if (remainingIds.length === 0) {
      logger.info("No remaining subevents for event", { eventId });
      return next(new ApiError(404, "No remaining subevents for this event"));
    }
    const passSubEvents = await PassSubEvent.findAll({
      where: { subevent_id: { [Op.in]: remainingIds } },
      include: [
        {
          model: Pass,
          as: "pass",
          where: { is_global: true, is_active: true },
          required: true,
        },
      ],
    });
    if (!passSubEvents || passSubEvents.length === 0) {
      logger.warn("No active global pass found for remaining subevents", {
        eventId,
      });
      return next(
        new ApiError(404, "No active global pass found for remaining subevents")
      );
    }
    const passMap = new Map(); // passId -> { pass: plainPass, coveredIds: Set }
    for (const pse of passSubEvents) {
      const pid = pse.pass_id;
      if (!passMap.has(pid)) {
        const plainPass = pse.pass ? pse.pass.get({ plain: true }) : null;
        passMap.set(pid, { pass: plainPass, coveredIds: new Set() });
      }
      passMap.get(pid).coveredIds.add(pse.subevent_id);
    }
    for (const [pid, info] of passMap.entries()) {
      if (info.coveredIds.size === remainingIds.length) {
        logger.info("Complete global pass found for event", {
          eventId,
          passId: pid,
        });
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              { pass: info.pass },
              "Complete global pass fetched successfully"
            )
          );
      }
    }

    const passes = [];
    for (const [pid, info] of passMap.entries()) {
      passes.push({
        pass: info.pass,
        covered_subevent_ids: Array.from(info.coveredIds),
        coverage_count: info.coveredIds.size,
        coverage_ratio: +(info.coveredIds.size / remainingIds.length).toFixed(
          3
        ),
      });
    }

    // Sort passes by coverage_count descending, so best match is first
    passes.sort((a, b) => b.coverage_count - a.coverage_count);

    logger.info("Partial global passes found for event", {
      eventId,
      billingUserId,
      candidatePasses: passes.map((p) => ({
        pass_id: p.pass.pass_id,
        coverage_count: p.coverage_count,
      })),
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          remaining_subevent_ids: remainingIds,
          pass: passes,
        },
        "Partial global pass coverage found for remaining subevents"
      )
    );
  } catch (error) {
    logger.error("Internal server error in getGlobalPassForEvent", {
      error,
      billingUserId: req.body?.billingUserId,
      eventId: req.body?.eventId,
    });
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

export {
  registerEvent,
  deleteEvent,
  getEventDetailById,
  updateEvent,
  getAllEventByAdmin,
  updateEventStatus,
  getAllSubeventsWithPasses,
  getGlobalPassForEvent,
};
