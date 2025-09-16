import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import Employee from "../db/models/employee.model.js";
import Admin from "../db/models/admin.model.js";
import Event from "../db/models/event.model.js";
import { Op, UUIDV1, UUIDV4 } from "sequelize";
import sendMail from "../utils/sendMail.js";
import { uploadOnCloudinary } from "../utils/clodinary.js";
import { generateQRCodeAndUpload } from "../services/qrGenerator.service.js";

// Create the event

// Controller to register an event-- working fine (change the things before push )
const registerEvent = asyncHandler(async (req, res, next) => {
  try {
    const { event_name, description, venue, google_map_link, number_of_days, date_start, date_end, event_type } = req.body;

    // Validate required fields
    if (!(event_name && description && google_map_link && number_of_days && date_start && date_end && venue && event_type)) {
      return next(new ApiError( 400, "Event name, venue, google map link, number of days, start and end date are required fields"));
    }

    // Ensure image is uploaded
    if (!(req.file)) {
      return next(new ApiError(400, "Event image is required"));
    }

    const imagelocalPath = req.file?.path;
    console.log(imagelocalPath)
    let imageUrl;
    if (imagelocalPath) {
      try {
        const a = await uploadOnCloudinary(imagelocalPath);
        console.log(a)
        imageUrl = a.url;
        console.log(imageUrl)
      } catch (error) {
        return next(
          new ApiError(500, "Error on uploading design on clodinary", error)
        );
      }
    } else {
      imageUrl = null;
    }

    console.log(imageUrl) 

    // Check if admin exists
    const admin = await Admin.findByPk(req.admin_id);
    if (!admin) {
      return next(new ApiError(404, "Admin not found"));
    }

    // Create the event
    const newEvent = await Event.create({
      event_name,
      description,
      venue,
      event_qr: null ,
      google_map_link,
      event_url: null,
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
      return next(new ApiError(500, "Failed to generate event QR", qrResult.error));
    }

    console.log(qrResult)

    newEvent.event_qr = qrResult.cloudinaryUrl;
    newEvent.event_url = qrResult.qrContentUrl;

    const updatedEvent = await newEvent.save();

    if (updatedEvent) {
      return res
        .status(200)
        .json(
          new ApiResponse(
            201,
            { event: updatedEvent },
            "Event created successfully"
          )
        );
      // send mail to the admin about the event -- check this part
      const admin = await Admin.findByPk(req.admin_id);
      const response = await sendMail(
        admin.email, // make sure you pass the email, not the whole object
        "Event Created Successfully",
        afterRegistrationSuccess
      );

      // check mail get send or not
      if (response.success) {
        return res
          .status(200)
          .json(new ApiResponse(200, "Event send successfully"));
      } else {
        setTimeout(async () => {
          try {
            await sendMail(
              admin.email,
              "Event Created Successfully",
              afterRegistrationSuccess
            );
            return res
              .status(200)
              .json(new ApiResponse(200, "Event send successfully"));
          } catch (error) {
            return next(new ApiError(500, "Internal Server Error", error));
          }
        }, 5000); // retry after 5 seconds
      }
    } else {
      return next(new ApiError(400, "Failed to create event"));
    }
  } catch (error) {
    console.error(error);
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

// Delete event by ID -- working fine
const deleteEvent = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return next(new ApiError(400, "Event ID is required"));
    }

    // Check if the event exists
    const event = await Event.findByPk(id);
    if (!event) {
      return next(new ApiError(404, "Event not found"));
    }

    // Delete the event
    await Event.destroy({
      where: { event_id: id },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Event deleted successfully"));
  } catch (error) {
    console.error(error);
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

// getEventDetails-- check working fine
const getEventDetailById = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await Event.findOne({
      where: { event_id: id }, // match event_id column
    });

    if (!event) {
      return next(new ApiError(404, `Event with id ${id} not found`));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, event, "Event fetched successfully"));
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

// update event -- working fine
const updateEvent = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const [updatedRows, [updatedEvent]] = await Event.update(updates, {
      where: { event_id: id },
      returning: true,
    });

    if (updatedRows === 0) {
      return next(new ApiError(404, `Event with id ${id} not found`));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, updatedEvent, "Event updated successfully"));
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

// get all the events -- working fine
const getAllCreatedEvents = asyncHandler(async (req, res, next) => {
  try {
    const events = await Event.findAll();

    if (!events || events.length === 0) {
      return next(new ApiError(404, "No events found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, events, "Events fetched successfully"));
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

// get all event created by admin- done

const getAllEventByAdmin = asyncHandler(async (req, res, next) => {
  try {
    const { admin_id } = req.params;

    if (!admin_id) {
      return next(new ApiError(400, "Admin id is required"));
    }

    // Find all events created by this admin
    const events = await Event.findAll({
      where: { admin_id: admin_id },
    });

    if (!events || events.length === 0) {
      return next(new ApiError(404, `No events found for admin id ${eventId}`));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, events, "Events fetched successfully"));
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

// fiter the data -- working fine
const filterEventData = asyncHandler(async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query) {
      return next(new ApiError(400, "Search query is required"));
    }

    const data = await Event.findAll({
      where: {
        event_name: {
          [Op.iLike]: `%${query}%`, // PostgreSQL case-insensitive
        },
      },
    });

    return res.status(200).json(
      new ApiResponse(200, "Events fetched successfully", {
        count: data.length,
        events: data,
      })
    );
  } catch (error) {
    next(error);
  }
});

// filter by type_of_event-- working fine

const FilterByTypeOfEvents = asyncHandler(async (req, resp, next) => {
  try {
    const { eventtype } = req.query;

    if (!eventtype) {
      return next(new ApiError(400, "Event type is required"));
    }

    const events = await Event.findAll({
      where: {
        type_of_event: eventtype, // exact match
      },
    });

    return resp.status(200).json(
      new ApiResponse(200, "Events fetched successfully", {
        count: events.length,
        events: events,
      })
    );
  } catch (error) {
    next(error);
  }
});

export {
  registerEvent,
  deleteEvent,
  getEventDetailById,
  updateEvent,
  getAllCreatedEvents,
  getAllEventByAdmin,
  filterEventData,
  FilterByTypeOfEvents,
};
