import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Op } from "sequelize";
import Attendee from "../db/models/attendee.model.js";

const GetAllAttendiesBySearch = asyncHandler(async (req, res, next) => {
  try {
    const inputtext = (req.query.inputtext || "").toLowerCase();
    const page = parseInt(req.query.page) || 1;
    const limit = 25;
    const offset = (page - 1) * limit;

    const { count, rows: attendees } = await Attendee.findAndCountAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${inputtext}%` } },
          { email: { [Op.like]: `%${inputtext}%` } },
          { whatsapp: { [Op.like]: `%${inputtext}%` } },
          
        ],
      },
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });

    const attendeeList = attendees.map((a) => ({
      attendee_id: a.attendee_id,
      name: a.name,
      email: a.email,
      whatsapp: a.whatsapp,
      gender: a.gender,
      dob: a.dob,
      address: a.address,
      admin_id: a.admin_id,
    }));

    const totalPages = Math.ceil(count / limit);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          attendees: attendeeList,
          pagination: {
            totalAttendees: count,
            currentPage: page,
            totalPages,
            perPage: limit,
          },
        },
        "Attendees fetched successfully"
      )
    );
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

export {GetAllAttendiesBySearch};
