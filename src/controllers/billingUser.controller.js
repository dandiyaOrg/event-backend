import BillingUser  from '../db/models/billingUser.model';
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Op } from "sequelize";



// fetch the data based on search 

import { Op } from "sequelize";

const GetBillUserDataBySearch = asyncHandler(async (req, res, next) => {
  try {
    const inputtext = (req.query.inputtext || "").toLowerCase();
    const page = parseInt(req.query.page) || 1;
    const limit = 25;
    const offset = (page - 1) * limit;

    const { count, rows: billinguserdata } = await BillingUser.findAndCountAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${inputtext}%` } },
          { mobile_no: { [Op.like]: `%${inputtext}%` } },
          { email: { [Op.like]: `%${inputtext}%` } },
        ],
      },
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });

    const BillingUserList = billinguserdata.map((e) => ({
      billing_user_id: e.billing_user_id,
      name: e.name,
      mobile_no: e.mobile_no,
      whatsapp: e.whatsapp,
      email: e.email,
      address: e.address,
      dob: e.dob,
      gender: e.gender,
      admin_id: e.admin_id,
    }));

    const totalPages = Math.ceil(count / limit);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          billinguser: BillingUserList,
          pagination: {
            totalbillinguser: count,
            currentPage: page,
            totalPages,
            perPage: limit,
          },
        },
        "BillingUser fetched successfully"
      )
    );
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});


