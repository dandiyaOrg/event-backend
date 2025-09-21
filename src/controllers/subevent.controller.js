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

    const event = await Event.findByPk(event_id);
    if (!event) {
      return next(new ApiError(404, `Event with id ${event_id} not found`));
    }
    const eventStartDate = new Date(event.date_start);
    const eventEndDate = new Date(event.date_end);
    const subEventDate = new Date(date);

    if (subEventDate < eventStartDate || subEventDate > eventEndDate) {
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
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

// checked- working
const deleteSubEvent = asyncHandler(async (req, res, next) => {
  try {
    const { subeventId } = req.params;
    if (!subeventId) {
      return next(new ApiError(400, "SubEvent id is required"));
    }

    const subEvent = await SubEvent.findOne({
      where: { subevent_id: subeventId },
    });

    if (!subEvent) {
      return next(
        new ApiError(404, `SubEvent with id ${subeventId} not found`)
      );
    }

    if (subEvent.images) {
      try {
        await deletefromCloudinary(subEvent.images, "image");
      } catch (error) {
        return next(
          new ApiError(500, "Error in deleting the old image", error)
        );
      }
    }

    await subEvent.destroy();

    return res
      .status(200)
      .json(new ApiResponse(200, null, "SubEvent deleted successfully"));
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

// checked-- working
const getAllSubeventOfEvent = asyncHandler(async (req, res, next) => {
  try {
    const { eventId } = req.params;

    if (!eventId) {
      return next(new ApiError(400, "Event id is required"));
    }

    const subEvents = await SubEvent.findAll({
      where: { event_id: eventId },
    });

    if (!subEvents || subEvents.length === 0) {
      return next(
        new ApiError(404, `No subevents found for event id ${eventId}`)
      );
    }

    return res
      .status(200)
      .json(new ApiResponse(200, subEvents, "Subevents fetched successfully"));
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});
// check- working
const getSubEventById = asyncHandler(async (req, res, next) => {
  try {
    const { subeventId } = req.params;

    if (!subeventId) {
      return next(new ApiError(400, "SubEvent id is required"));
    }

    const subEvent = await SubEvent.findOne({
      where: { subevent_id: subeventId },
    });

    if (!subEvent) {
      return next(
        new ApiError(404, `SubEvent with id - ${subeventId} not found`)
      );
    }

    return res
      .status(200)
      .json(new ApiResponse(200, subEvent, "SubEvent fetched successfully"));
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});
// checked working -- name miss match issue
const UpdateSubevent = asyncHandler(async (req, res, next) => {
  try {
    const { subeventId } = req.params;
    console.log(subeventId);
    const { name, date, start_time, end_time, day, quantity, description } =
      req.body;
    if (!subeventId) {
      return next(new ApiError(400, "eventId and subEventId are required"));
    }

    const subEvent = await SubEvent.findByPk(subeventId);
    if (!subEvent) {
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
    if (day && day !== subEvent.day) {
      const existingSubevent = await SubEvent.findOne({
        where: { event_id: subEvent.event_id, day: day },
      });
      if (existingSubevent) {
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
        where: { name: name, event_id: subEvent.event_id },
      });
      if (existingEvent) {
        return next(
          new ApiError(
            400,
            "Sub event with this name already exists for the event"
          )
        );
      }
    }

    const previousImage = subEvent.images;

    // Update sub-event
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

    if (imageUrl) {
      if (previousImage) {
        await deletefromCloudinary(previousImage, "image");
      }
    }
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
