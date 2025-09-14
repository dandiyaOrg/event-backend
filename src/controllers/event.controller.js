import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import Employee from "../db/models/employee.model.js";
import Admin from "../db/models/admin.model.js";
import { Op } from "sequelize";
import sendMail from "../utils/sendMail.js";

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
    } = req.body;

    if (
      !(
        event_name &&
        venue &&
        google_map_link &&
        number_of_days &&
        date_end &&
        date_start
      )
    ) {
      return next(
        new ApiError(
          400,
          "Event name, venue, google map link, number of days, start and end date are required fields"
        )
      );
    }
    const admin = await Admin.findByPk(req.admin_id);

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { user: newAdmin },
          "Admin registered successfully"
        )
      );
  } catch (error) {
    console.error(error);
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

export { registerEvent };
