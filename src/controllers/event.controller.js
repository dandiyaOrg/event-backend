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
  EventBillingUsers,
} from "../db/models/index.js";
import {
  uploadOnCloudinary,
  deletefromCloudinary,
} from "../utils/clodinary.js";
import { generateQRCodeAndUpload } from "../services/qrGenerator.service.js";

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
      return next(
        new ApiError(
          400,
          "Event name, venue, google map link, number of days, start and end date are required fields"
        )
      );
    }

    if (!req.file) {
      return next(new ApiError(400, "Event image is required"));
    }
    const imagelocalPath = req.body.image;
    let imageUrl;
    if (imagelocalPath) {
      try {
        const { success, data, error } =
          await uploadOnCloudinary(imagelocalPath);
        if (!success) {
          return next(
            new ApiError(500, "Error on uploading design on clodinary", error)
          );
        }
        imageUrl = data;
      } catch (error) {
        return next(
          new ApiError(500, "Error on uploading design on clodinary", error)
        );
      }
    } else {
      imageUrl = null;
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
      return next(new ApiError(400, "Failed to create event"));
    }
    const qrResult = await generateQRCodeAndUpload(newEvent.event_id);

    if (!qrResult.success) {
      return next(
        new ApiError(500, "Failed to generate event QR", qrResult.error)
      );
    }

    newEvent.event_qr = qrResult.cloudinaryUrl;
    newEvent.event_url = qrResult.qrContentUrl;

    const updatedEvent = await newEvent.save();

    if (!updatedEvent) {
      return next(new ApiError(400, "Failed to create event"));
    }
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
      return next(
        new ApiError(502, "Failed to send credentials update email", error)
      );
    }
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
    console.error(error);
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const deleteEvent = asyncHandler(async (req, res, next) => {
  try {
    const { eventId } = req.params;
    if (!eventId) {
      return next(new ApiError(400, "Event ID is required in query params"));
    }

    const event = await Event.findByPk(eventId);
    if (!event) {
      return next(new ApiError(404, "Event not found"));
    }
    const isDeleted = await deletefromCloudinary(
      [event.event_image, event.event_qr],
      "image"
    );
    if (!isDeleted) {
      return next(
        new ApiError(500, "Failed to delete event images from cloud")
      );
    }

    // Delete the event
    await Event.destroy({
      where: { event_id: eventId },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Event deleted successfully"));
  } catch (error) {
    console.error(error);
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const getEventDetailById = asyncHandler(async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findByPk(eventId);

    if (!event) {
      return next(new ApiError(404, `Event with id ${eventId} not found`));
    }
    return res
      .status(200)
      .json(new ApiResponse(200, event, "Event fetched successfully"));
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const updateEvent = asyncHandler(async (req, res, next) => {
  try {
    const { eventId } = req.params;
    if (!eventId) {
      return next(new ApiError(400, "Event ID is required in params"));
    }
    const event = await Event.findByPk(eventId);
    if (!event) {
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
      const imagelocalPath = req?.image;
      if (imagelocalPath) {
        try {
          const { success, data, error } =
            await uploadOnCloudinary(imagelocalPath);
          if (!success) {
            return next(
              new ApiError(
                500,
                "Error on uploading event image on clodinary",
                error
              )
            );
          }
          imageUrl = data;
        } catch (error) {
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

    if (imageUrl) {
      if (previousImage) {
        await deletefromCloudinary([previousImage], "image");
      }
    }
    return res
      .status(200)
      .json(new ApiResponse(200, updatedEvent, "Event updated successfully"));
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const updateEventStatus = asyncHandler(async (req, res, next) => {
  try {
    const { eventId } = req.params;
    if (!eventId) {
      return next(new ApiError(400, "Event ID is required in params"));
    }
    const event = await Event.findByPk(eventId);
    if (!event) {
      return next(new ApiError(404, `Event with id ${eventId} not found`));
    }
    const { status } = req.body;
    const updatedEvent = await event.update({
      status: status ?? event.status,
    });
    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedEvent, "Event status updated successfully")
      );
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const getAllEventByAdmin = asyncHandler(async (req, res, next) => {
  try {
    const admin_id = req.admin_id;
    const events = await Event.findAll({
      where: { admin_id: admin_id },
    });

    if (!events || events.length === 0) {
      return next(
        new ApiError(404, `No events found for admin id ${admin_id}`)
      );
    }
    return res
      .status(200)
      .json(new ApiResponse(200, events, "Events fetched successfully"));
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const getAllSubeventsWithPasses = asyncHandler(async (req, res, next) => {
  try {
    const { billingUserId, eventId } = req.body;
    if (!billingUserId) {
      return next(400, "Billing User Id is required");
    }
    // Validate billing user exists
    const billingUser = await BillingUser.findByPk(billingUserId);
    if (!billingUser) {
      return next(
        new ApiError(404, `Billing user with id ${billingUserId} not found`)
      );
    }

    // Validate event exists
    const event = await Event.findByPk(eventId);
    if (!event) {
      return next(new ApiError(404, `Event with id ${eventId} not found`));
    }

    // Optional: Check if billing user has access to this event
    // You might want to add this validation based on your business logic
    const hasAccess = await EventBillingUsers.findOne({
      where: {
        event_id: eventId,
        billing_user_id: billingUserId,
      },
    });

    if (!hasAccess) {
      return next(new ApiError(403, "You don't have access to this event"));
    }

    // Get subevents with their associated passes
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
      ],
      include: [
        {
          model: Pass,
          as: "passes", // ← Make sure this matches your association alias
          where: { is_active: true },
          required: false, // LEFT JOIN - includes subevents even without passes
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

    // Convert to plain objects for better JSON response
    const subeventData = subevents.map((subevent) =>
      subevent.get({ plain: true })
    );

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
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const getGlobalPassForEvent = asyncHandler(async (req, res, next) => {
  try {
    const { billingUserId, eventId } = req.body;
    if (!billingUserId) {
      return next(400, "Billing User Id is required");
    }
    if (!eventId) {
      return next(new ApiError(400, "Event ID is required in query params"));
    }
    const event = await Event.findByPk(eventId);
    if (!event) {
      return next(new ApiError(404, `Event with id ${eventId} not found`));
    }

    // 2. Get subevents for this event
    const subevents = await SubEvent.findAll({
      where: { event_id: eventId },
      attributes: ["subevent_id"],
    });

    const subeventIds = subevents.map((s) => s.subevent_id);
    if (subeventIds.length === 0) {
      return next(new ApiError(404, "No subevents found for this event"));
    }

    // 3. Find global passes linked to any subevent of this event
    // Using the is_global field and checking if pass is linked to this event's subevents
    const globalPasses = await PassSubEvent.findAll({
      where: {
        subevent_id: { [Op.in]: subeventIds },
      },
      include: [
        {
          model: Pass,
          as: "pass", // Use the alias from associations
          where: {
            is_global: true,
            is_active: true, // Only get active passes
          },
          required: true,
        },
      ],
      attributes: ["pass_id"],
      group: ["pass_id", "pass.pass_id"], // Group by pass to avoid duplicates
    });

    if (globalPasses.length === 0) {
      return next(
        new ApiError(404, "No active global pass found for this event")
      );
    }

    // 4. For each global pass, verify it's linked to ALL subevents of this event
    let validGlobalPass = null;

    for (const passSubEvent of globalPasses) {
      const passId = passSubEvent.pass_id;

      // Count how many subevents this pass is linked to
      const linkedSubeventsCount = await PassSubEvent.count({
        where: {
          pass_id: passId,
          subevent_id: { [Op.in]: subeventIds },
        },
      });

      // If this pass is linked to all subevents of the event, it's a valid global pass
      if (linkedSubeventsCount === subeventIds.length) {
        validGlobalPass = passSubEvent.pass;
        break;
      }
    }

    if (!validGlobalPass) {
      return next(
        new ApiError(404, "No complete global pass found for this event")
      );
    }

    // 5. Return the global pass details
    const passData = validGlobalPass.get({ plain: true });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { pass: passData },
          "Global pass fetched successfully"
        )
      );
  } catch (error) {
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
