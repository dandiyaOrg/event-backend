import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import Admin from "../db/models/admin.model.js";
import Event from "../db/models/event.model.js";
import sendMail from "../utils/sendMail.js";
import { uploadOnCloudinary } from "../utils/clodinary.js";
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

    const imagelocalPath = req.image;
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
    if (!emailData || !emailData.id) {
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
    if (req.file) {
      const imagelocalPath = req.file?.path;
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

export {
  registerEvent,
  deleteEvent,
  getEventDetailById,
  updateEvent,
  getAllEventByAdmin,
  updateEventStatus,
};
