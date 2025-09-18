import { Pass } from "../db/models";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Pass } from "../db/models/index.js";
// Allowed categories
const ALLOWED_CATEGORIES = [
  "Group",
  "Stag Male",
  "Stag Female",
  "Couple",
  "Full Pass",
];

// Router: /event/:eventId/subevent/:subEventId/pass -- working this part but what about final price
const createPass = asyncHandler(async (req, res, next) => {
  try {
    const { category, total_price, discount_percentage, validity } = req.body;

    // Required fields check
    if (!category || !total_price || !validity) {
      return next(
        new ApiError(400, "Category, total_price, and validity are required")
      );
    }

    // Validate category
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return next(
        new ApiError(
          400,
          `Category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`
        )
      );
    }

    // Create Pass
    const pass = await Pass.create({
      category,
      total_price,
      discount_percentage,
      validity,
    });

    // Convert to plain object to include virtual fields
    const data = pass.get({ plain: true });

    return res
      .status(201)
      .json(new ApiResponse(true, 201, "Pass created successfully", data));
  } catch (error) {
    return next(new ApiError(500, error.message || "Internal Server Error"));
  }
});

// Router: /event/:eventId/subevent/:subEventId/pass/:passId-- working checked
const deletePass = asyncHandler(async (req, res, next) => {
  try {
    const { passId } = req.params;

    if (!passId) {
      return next(new ApiError(400, "Pass ID is required"));
    }

    // Find the pass
    const pass = await Pass.findByPk(passId);
    if (!pass) {
      return next(new ApiError(404, "Pass not found"));
    }

    // Delete the pass
    await pass.destroy();

    return res
      .status(200)
      .json(new ApiResponse(true, 200, "Pass deleted successfully"));
  } catch (error) {
    return next(new ApiError(500, error.message || "Internal Server Error"));
  }
});

// Router: /event/:eventId/subevent/:subEventId/pass/:passId
// sort final price issue then recode and update that -- not check
const updatePass = asyncHandler(async (req, res, next) => {
  try {
    const { passId } = req.params;
    const { category, total_price, discount_percentage, validity } = req.body;

    if (!passId) {
      return next(new ApiError(400, "Pass ID is required"));
    }

    const pass = await Pass.findByPk(passId);
    if (!pass) {
      return next(new ApiError(404, "Pass not found"));
    }

    if (category && !ALLOWED_CATEGORIES.includes(category)) {
      return next(
        new ApiError(
          400,
          `Category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`
        )
      );
    }

    if (category) pass.category = category;
    if (total_price !== undefined) pass.total_price = total_price;
    if (discount_percentage !== undefined)
      pass.discount_percentage = discount_percentage;
    if (validity !== undefined) pass.validity = validity;

    await pass.save();

    return res
      .status(200)
      .json(new ApiResponse(true, 200, "Pass updated successfully", pass));
  } catch (error) {
    return next(new ApiError(500, error.message || "Internal Server Error"));
  }
});

// get all the passes of the event
const getAllPassForSubevent = asyncHandler(async (req, res, next) => {
  try {
    const passes = await Pass.findAll();

    if (!passes || passes.length === 0) {
      return next(new ApiError(404, "No passes found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(true, 200, "Passes retrieved successfully", passes)
      );
  } catch (error) {
    return next(new ApiError(500, error.message || "Internal Server Error"));
  }
});

// get pass by id

const getPassById = asyncHandler(async (req, res, next) => {
  try {
    const { passId } = req.params;

    if (!passId) {
      return next(new ApiError(400, "Pass ID is required"));
    }

    const pass = await Pass.findByPk(passId);

    if (!pass) {
      return next(new ApiError(404, "Pass not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(true, 200, "Pass retrieved successfully", pass));
  } catch (error) {
    return next(new ApiError(500, error.message || "Internal Server Error"));
  }
});

export {
  createPass,
  deletePass,
  updatePass,
  getPassById,
  getAllPassForSubevent,
};
