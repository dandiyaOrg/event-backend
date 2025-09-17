import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import IssuedPass from "../db/models/issuedpass.model.js";
import Pass from "../db/models/pass.model.js";
import SubEvent from "../db/models/subevent.model.js";
import Attendee from "../db/models/attendee.model.js";
import CheckingRecord from "../db/models/checkin.record.model.js";
import moment from "moment-timezone";
// send all the information of the Issued pass to the frontend

const GetAllDetailOfIssuedPass = asyncHandler(async (req, res, next) => {
  try {
    const { issued_pass_id } = req.query;

    if (!issued_pass_id) {
      return next(new ApiError(400, "Issued Pass Id is Required"));
    }

    // Fetch issued pass with related data in one query
    const issuedPassDetail = await IssuedPass.findOne({
      where: { issued_pass_id },
      include: [
        { model: Pass, attributes: ["category"] }, // pass details
        { 
          model: SubEvent, 
          attributes: ["name", "description", "start_time", "end_time", "event_id"],
          include: [
            { model: Event, attributes: ["event_name"] }
          ]
        },
        { model: Attendee, attributes: ["name"] }
      ]
    });

    if (!issuedPassDetail) {
      return next(new ApiError(404, "Issued Pass Id is Invalid"));
    }

    // Destructure nested data
    const { booking_number, status, used_count, sponsored_pass } = issuedPassDetail;
    const passCategory = issuedPassDetail.Pass?.category || null;
    const subEvent = issuedPassDetail.SubEvent;
    const attendeeName = issuedPassDetail.Attendee?.name || null;

    if (!subEvent) return next(new ApiError(404, "SubEvent not found"));
    if (!subEvent.Event) return next(new ApiError(404, "Event not found"));

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          PassCategory: passCategory,
          Event_Name: subEvent.Event.event_name,
          SubEvent_Name: subEvent.name,
          SubEvent_Description: subEvent.description,
          SubEvent_StartTime: subEvent.start_time,
          SubEvent_EndTime: subEvent.end_time,
          Attendee_Name: attendeeName,
          Booking_Number: booking_number,
          Status: status,
          IsSponsoredPass: sponsored_pass,
          Used_Count: used_count,
        },
        "Issued Pass Detail"
      )
    );

  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});


// post request to make the user check in and update the bakend details

const CheckInIssuedPass = asyncHandler(async (req, res, next) => {
  try {
    const { issued_pass_id, employee_id ,checkin_method,checked_in_by} = req.query;

    if (!issued_pass_id || !employee_id) {
      return next(new ApiError(400, "IssuedPassId and EmployeeId is required"));
    }

    // get the issued pass data
    const data = await IssuedPass.findOne({
      where: { issued_pass_id },
      attributes: ["is_expired", "expiry_date", "status", "used_count", "subevent_id"],
    });

    if (!data) {
      return next(new ApiError(404, "Issued Pass Id is Invalid"));
    }

    const { is_expired, expiry_date, status, used_count, subevent_id } = data;

    const today = new Date(); // current date
    const expiry = new Date(expiry_date); // expiry date from DB

    // Compare only dates (
    const todayDateOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const expiryDateOnly = new Date(
      expiry.getFullYear(),
      expiry.getMonth(),
      expiry.getDate()
    );

    if (
      ["expired", "used", "cancelled"].includes(status) ||
      is_expired ||
      used_count === 0 ||
      expiryDateOnly < todayDateOnly
    ) {
      return res
        .status(200)
        .json(new ApiResponse(200, "Issued Pass is not valid"));
    }

    // check used on that day or not through checkintable

    const istStart = moment
      .tz(moment(), "Asia/Kolkata")
      .startOf("day")
      .utc()
      .format();
    const istEnd = moment
      .tz(moment(), "Asia/Kolkata")
      .endOf("day")
      .utc()
      .format();

    const CheckInDetails = await CheckingRecord.findOne({
      where: {
        issued_pass_id,
        subevent_id,
        checkin_time: {
          [Op.between]: [istStart, istEnd],
        },
      },
    });

    // if used have a entry in that checkingrecord dont allow user
    if (CheckInDetails) {
      return res
        .status(200)
        .json(
          new ApiResponse(200, "This Issued Pass is Already been Used required")
        );
    } else {
      // update the data in the issued pass

      let newUsedCount = used_count - 1;

      // prepare update fields
      let updateFields = {
        used_count: newUsedCount,
      };

      // if used_count becomes 0, mark as used and expired
      if (newUsedCount <= 0) {
        updateFields.status = "used";
        updateFields.is_expired = true;
      }
      await IssuedPass.update(updateFields, {
        where: { issued_pass_id },
      });

      // create check-in record for today
      await CheckingRecord.create({
        issued_pass_id,
        employee_id,
        subevent_id,
        checkin_method,
        checked_in_by,
        checkin_time: new Date().toISOString(), // store UTC time
      });

      return res.status(200).json(
        new ApiResponse(200, "Check-in successful", {
          used_count: newUsedCount,
        })
      );
    }
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

export { GetAllDetailOfIssuedPass, CheckInIssuedPass };
