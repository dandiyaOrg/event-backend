import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import SubEvent from "../db/models/subevent.model.js";
import { validate as isUUID } from "uuid"; 
import { Op, UUIDV1, UUIDV4 } from "sequelize";
// Create a SubEvent in an Event - working fine
const createSubEvent = asyncHandler(async (req, res, next) => {
  try {
    const { eventId } = req.params; // get eventId from URL
    const {
      name,
      admin_id,
      date,
      start_time,
      end_time,
      day,
      quantity,
      images,
      description,
    } = req.body;

    if (!name || !eventId || !admin_id || !date || !start_time || !end_time) {
      return next(
        new ApiError(
          400,
          "SubEvent name, event_id, admin_id, date, start_time, and end_time are required fields"
        )
      );
    }

    const newSubEvent = await SubEvent.create({
      name,
      description,
      event_id: eventId, 
      admin_id,
      date,
      start_time,
      end_time,
      day,
      quantity,
      available_quantity: quantity,
      images,
    });

    return res.status(201).json(
      new ApiResponse(
        201,
        { subEvent: newSubEvent },
        "SubEvent created successfully"
      )
    );
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});


// delete the subevent  -- working fine

const deleteSubEvent = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return next(new ApiError(400, "SubEvent id is required"));
    }

    // Find subevent by primary key
    const subEvent = await SubEvent.findOne({ where: { subevent_id: id } });

    if (!subEvent) {
      return next(new ApiError(404, `SubEvent with id ${id} not found`));
    }

    // Delete the subevent
    await subEvent.destroy();

    return res
      .status(200)
      .json(new ApiResponse(200, null, "SubEvent deleted successfully"));
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

// Get all subevents of an event-- working fine
const getAllSubeventOfEvent = asyncHandler(async (req, res, next) => {
  try {
    const { eventId } = req.params; // event_id

    if (!eventId) {
      return next(new ApiError(400, "Event id is required"));
    }

    // Find all subevents with this event_id
    const subEvents = await SubEvent.findAll({
      where: { event_id: eventId },
    });

    if (!subEvents || subEvents.length === 0) {
      return next(new ApiError(404, `No subevents found for event id ${id}`));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, subEvents, "Subevents fetched successfully"));
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

// Get a subevent by its id -- working fine
const getSubEventById = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new ApiError(400, "SubEvent id is required"));
    }

    const subEvent = await SubEvent.findOne({
      where: { subevent_id: id },
    });

    if (!subEvent) {
      return next(new ApiError(404, `SubEvent with id ${id} not found`));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, subEvent, "SubEvent fetched successfully"));
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

// filter the subevent with search- working fine 

const filterSubEvents = asyncHandler(async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { query } = req.query;

    if (!query) {
      return next(new ApiError(400, "Search query is required"));
    }

    if (!eventId || !isUUID(eventId)) {
      return next(new ApiError(400, "Valid Event ID is required"));
    }

    const data = await SubEvent.findAll({
      where: {
        event_id: eventId, 
        name: {
          [Op.iLike]: `%${query}%`,
        },
      },
    });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error(error); 
    next(new ApiError(500, "Internal Server Error", error.message));
  }
});

// update the sub event -- working checked

const UpdatetheSubevent = asyncHandler(async (req, res, next) => {
  try {
    const { eventId, subEventId } = req.params;
    const updateData = req.body; 

    if (!eventId || !subEventId) {
      return next(new ApiError(400, "eventId and subEventId are required"));
    }

    // Find sub-event
    const subEvent = await SubEvent.findOne({
      where: { subevent_id: subEventId, event_id: eventId },
    });

    if (!subEvent) {
      return next(new ApiError(404, "SubEvent not found"));
    }

    // Update sub-event
    await subEvent.update(updateData);

    return res.status(200).json(
      new ApiResponse(200, { subEvent }, "SubEvent updated successfully")
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
  filterSubEvents,
  UpdatetheSubevent
};
