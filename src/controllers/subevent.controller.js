import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {
  uploadOnCloudinary,
  deletefromCloudinary,
} from "../utils/clodinary.js";
import { Event, SubEvent } from "../db/models/index.js";
import { validate as isUUID } from "uuid";
import { Op } from "sequelize";
import { logger } from "../app.js";
// checked- fine - small issues fixed
const createSubEvent = asyncHandler(async (req, res, next) => {
  try {
    const {
      name,
      event_id,
      date,
      start_time,
      end_time,
      day,
      quantity,
      description,
    } = req.body;

    logger.info("Create subevent request received", {
      name,
      event_id,
      day,
      admin_id: req.admin_id,
    });

    const event = await Event.findByPk(event_id);
    if (!event) {
      logger.warn(`Event not found: ${event_id}`);
      return next(new ApiError(404, `Event with id ${event_id} not found`));
    }

    const eventStartDate = new Date(event.date_start);
    const eventEndDate = new Date(event.date_end);
    const subEventDate = new Date(date);

    if (subEventDate < eventStartDate || subEventDate > eventEndDate) {
      logger.warn(`SubEvent date ${date} is outside event date range`, {
        eventStartDate,
        eventEndDate,
      });
      return next(
        new ApiError(
          400,
          `SubEvent date must be between event start date (${event.date_start}) and end date (${event.date_end})`
        )
      );
    }

    const existingEvent = await SubEvent.findOne({
      where: { name: name, event_id: event_id },
    });
    if (existingEvent) {
      logger.warn(
        `SubEvent with name "${name}" already exists for event ${event_id}`
      );
      return next(
        new ApiError(
          400,
          "Sub event with this name already exists for the event"
        )
      );
    }

    const existingSubevent = await SubEvent.findOne({
      where: { event_id: event_id, day: day },
    });
    if (existingSubevent) {
      logger.warn(
        `SubEvent for day ${day} already exists for event ${event_id}`
      );
      return next(
        new ApiError(
          400,
          `Sub event for day ${day} already exists for the event`
        )
      );
    }

    const countSubevents = await SubEvent.count({
      where: { event_id: event_id },
    });
    if (countSubevents >= event.number_of_days) {
      logger.warn(`Maximum subevents reached for event ${event_id}`);
      return next(
        new ApiError(
          400,
          `Cannot add more subevents. The event allows a maximum of ${event.number_of_days} subevents.`
        )
      );
    }
    const imagelocalPath = req.file.path;
    let imageUrl;
    if (imagelocalPath) {
      try {
        const { success, data, error } =
          await uploadOnCloudinary(imagelocalPath);
        if (!success) {
          logger.error("Cloudinary upload failed", error);
          return next(
            new ApiError(500, "Error on uploading design on cloudinary", error)
          );
        }
        imageUrl = data;
      } catch (error) {
        logger.error("Cloudinary upload exception", error);
        return next(
          new ApiError(500, "Error on uploading design on cloudinary", error)
        );
      }
    } else {
      imageUrl = null;
    }

    const newSubEvent = await SubEvent.create({
      name,
      description,
      event_id,
      admin_id: req.admin_id,
      date,
      start_time,
      end_time,
      day,
      quantity,
      available_quantity: quantity,
      images: [imageUrl],
    });

    logger.info("SubEvent created successfully", {
      subEventId: newSubEvent.subevent_id,
      event_id,
      admin_id: req.admin_id,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { subEvent: newSubEvent },
          "SubEvent Registered successfully"
        )
      );
  } catch (error) {
    logger.error("Error in createSubEvent", error);
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

// checked- working
const deleteSubEvent = asyncHandler(async (req, res, next) => {
  try {
    const { subeventId } = req.params;
    logger.info("Delete SubEvent request received", {
      subeventId,
      admin_id: req.admin_id,
    });

    if (!subeventId) {
      logger.warn("Delete failed: subeventId missing in params");
      return next(new ApiError(400, "SubEvent id is required"));
    }

    const subEvent = await SubEvent.findOne({
      where: { subevent_id: subeventId },
    });
    if (!subEvent) {
      logger.warn(`SubEvent not found: ${subeventId}`);
      return next(
        new ApiError(404, `SubEvent with id ${subeventId} not found`)
      );
    }

    if (subEvent.images) {
      try {
        await deletefromCloudinary(subEvent.images, "image");
        logger.info("SubEvent images deleted from Cloudinary", {
          subeventId,
          images: subEvent.images,
        });
      } catch (error) {
        logger.error("Error deleting SubEvent images from Cloudinary", {
          subeventId,
          error,
        });
        return next(
          new ApiError(500, "Error in deleting the old image", error)
        );
      }
    }

    await subEvent.destroy();
    logger.info("SubEvent deleted successfully", { subeventId });

    return res
      .status(200)
      .json(new ApiResponse(200, null, "SubEvent deleted successfully"));
  } catch (error) {
    logger.error("Error in deleteSubEvent", error);
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

// checked-- working
const getAllSubeventOfEvent = asyncHandler(async (req, res, next) => {
  try {
    const { eventId } = req.params;
    logger.info("Get all subevents request received", {
      eventId,
      admin_id: req.admin_id,
    });

    if (!eventId) {
      logger.warn("Event ID missing in params");
      return next(new ApiError(400, "Event id is required"));
    }

    const subEvents = await SubEvent.findAll({
      where: { event_id: eventId },
    });

    if (!subEvents || subEvents.length === 0) {
      logger.warn(`No subevents found for event id ${eventId}`);
      return next(
        new ApiError(404, `No subevents found for event id ${eventId}`)
      );
    }

    logger.info(`Fetched ${subEvents.length} subevents for event ${eventId}`);

    return res
      .status(200)
      .json(new ApiResponse(200, subEvents, "Subevents fetched successfully"));
  } catch (error) {
    logger.error("Error in getAllSubeventOfEvent", error);
    return next(new ApiError(500, "Internal Server Error", error));
  }
});
// check- working
const getSubEventById = asyncHandler(async (req, res, next) => {
  try {
    const { subeventId } = req.params;
    logger.info("Get SubEvent by ID request received", {
      subeventId,
      admin_id: req.admin_id,
    });

    if (!subeventId) {
      logger.warn("SubEvent ID missing in params");
      return next(new ApiError(400, "SubEvent id is required"));
    }

    const subEvent = await SubEvent.findOne({
      where: { subevent_id: subeventId },
    });

    if (!subEvent) {
      logger.warn(`SubEvent not found: ${subeventId}`);
      return next(
        new ApiError(404, `SubEvent with id - ${subeventId} not found`)
      );
    }

    logger.info("SubEvent fetched successfully", { subeventId });
    return res
      .status(200)
      .json(new ApiResponse(200, subEvent, "SubEvent fetched successfully"));
  } catch (error) {
    logger.error("Error in getSubEventById", error);
    return next(new ApiError(500, "Internal Server Error", error));
  }
});
// checked working -- name miss match issue
const UpdateSubevent = asyncHandler(async (req, res, next) => {
  try {
    const { subeventId } = req.params;
    const { name, date, start_time, end_time, day, quantity, description } =
      req.body;
    logger.info("Update SubEvent request received", {
      subeventId,
      admin_id: req.admin_id,
    });

    if (!subeventId) {
      logger.warn("SubEvent ID missing in params");
      return next(new ApiError(400, "eventId and subEventId are required"));
    }

    const subEvent = await SubEvent.findByPk(subeventId);
    if (!subEvent) {
      logger.warn(`SubEvent not found: ${subeventId}`);
      return next(
        new ApiError(404, `SubEvent with id = ${subeventId} not found`)
      );
    }

    let imageUrl;
    if (req.file) {
      const imagelocalPath = req.file.path;
      if (imagelocalPath) {
        try {
          const { success, data, error } =
            await uploadOnCloudinary(imagelocalPath);
          if (!success) {
            logger.error("Cloudinary upload failed", { subeventId, error });
            return next(
              new ApiError(
                500,
                "Error on uploading event image on clodinary",
                error
              )
            );
          }
          imageUrl = data;
          logger.info("SubEvent image uploaded to Cloudinary", {
            subeventId,
            imageUrl,
          });
        } catch (error) {
          logger.error("Error during Cloudinary upload", { subeventId, error });
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

    if (day && day !== subEvent.day) {
      const existingSubevent = await SubEvent.findOne({
        where: { event_id: subEvent.event_id, day: day },
      });
      if (existingSubevent) {
        logger.warn(`Day ${day} already exists for event ${subEvent.event_id}`);
        return next(
          new ApiError(
            400,
            `Sub event for day ${day} already exists for the event`
          )
        );
      }
    }

    if (name && name !== subEvent.name) {
      const existingEvent = await SubEvent.findOne({
        where: { name, event_id: subEvent.event_id },
      });
      if (existingEvent) {
        logger.warn(
          `SubEvent name ${name} already exists for event ${subEvent.event_id}`
        );
        return next(
          new ApiError(
            400,
            "Sub event with this name already exists for the event"
          )
        );
      }
    }

    const previousImage = subEvent.images;

    const updatedEvent = await subEvent.update({
      name: name ?? subEvent.name,
      date: date ?? subEvent.date,
      start_time: start_time ?? subEvent.start_time,
      end_time: end_time ?? subEvent.end_time,
      day: day ?? subEvent.day,
      quantity: quantity ?? subEvent.quantity,
      description: description ?? subEvent.description,
      images: imageUrl ? [imageUrl] : previousImage,
    });

    if (imageUrl && previousImage) {
      try {
        await deletefromCloudinary(previousImage, "image");
        logger.info("Previous SubEvent image deleted from Cloudinary", {
          subeventId,
          previousImage,
        });
      } catch (error) {
        logger.error("Error deleting previous SubEvent image from Cloudinary", {
          subeventId,
          error,
        });
      }
    }

    logger.info("SubEvent updated successfully", { subeventId });
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { subEvent: updatedEvent },
          "SubEvent updated successfully"
        )
      );
  } catch (error) {
    logger.error("Error in UpdateSubevent", { error });
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

export {
  createSubEvent,
  deleteSubEvent,
  getAllSubeventOfEvent,
  getSubEventById,
  UpdateSubevent,
};
