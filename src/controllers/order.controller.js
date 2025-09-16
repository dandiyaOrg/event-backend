import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Op } from "sequelize";
import Order from "../db/models/order.model.js";

const GetOrderBySearch=asyncHandler(async (req,res,next) => {
    try {
    const inputtext = (req.query.inputtext || "").toLowerCase();
    const page = parseInt(req.query.page) || 1;
    const limit = 25;
    const offset = (page - 1) * limit;

    const { count, rows: orders } = await Order.findAndCountAll();

    } catch (error) {
        
    }
})