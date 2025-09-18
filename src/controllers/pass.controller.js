import { Pass } from "../db/models";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Pass, SubEvent ,PassSubEvent } from "../db/models/index.js";

// Allowed categories
const ALLOWED_CATEGORIES = [
  "Group",
  "Stag Male",
  "Stag Female",
  "Couple",
  "Full Pass",
];

const createNewPass = asyncHandler(async (req, res, next) => {
  try {
    const { category, total_price, discount_percentage, validity, subevent_id } = req.body;

    if (!subevent_id){
      return next(
        new ApiError(400, "Subevent Id is required.")
      );
    }

    if (!(category && total_price && validity && discount_percentage)) {
      return next(
        new ApiError(400, "Category, total_price, discount_percentage and validity are required")
      );
    }

    if (!ALLOWED_CATEGORIES.includes(category)) {
      return next(
        new ApiError(
          400,
          `Category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`
        )
      );
    }

    const duplicate = await PassSubEvent.findOne({
      where: { subevent_id: subevent_id },
      include: [
        {
          model: Pass,
          where: { category },
          required: true,
        },
      ],
    });

    if (duplicate) {
      return next(
        new ApiError(
          400, 
          `A pass with category "${category}" already exists for this subevent`
        )
      );
    }

    const pass = await Pass.create({
      category,
      total_price,
      discount_percentage,
      validity,
    });

    await PassSubEvent.create({
      pass_id: pass.pass_id,
      subevent_id,
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

const deletePass = asyncHandler(async (req, res, next) => {
  try {
    const { passId } = req.params;

    if (!passId) {
      return next(new ApiError(400, "Pass ID is required"));
    }

    const pass = await Pass.findByPk(passId);
    if (!pass) {
      return next(new ApiError(404, "Pass not found"));
    }

    if (pass.is_active) {
      return next(new ApiError(400, "You cannot delete an activated pass"));
    }

    await pass.destroy();

    return res
      .status(200)
      .json(new ApiResponse(true, 200, "Pass deleted successfully"));
  } catch (error) {
    return next(new ApiError(500, error.message || "Internal Server Error"));
  }
});

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

    const passSubEvents = await PassSubEvent.findAll({
      where: { pass_id: passId },
      attributes: ["subevent_id"],
    });

    const subeventIds = passSubEvents.map((entry) => entry.subevent_id);

    const subevents = await SubEvent.findAll({
      where: { subevent_id: subeventIds },
      attributes: ["subevent_id", "name"],
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200, 
          "Pass retrieved successfully", 
          { 
            pass,
            subevents
          }
        )
      );
  } catch (error) {
    return next(new ApiError(500, error.message || "Internal Server Error"));
  }
});

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

    if (category) {

      const passSubEvent = await PassSubEvent.findOne({
        where: { pass_id: passId },
      });

      if (!passSubEvent) {
        return next(
          new ApiError(404, "PassSubEvent relation not found for this pass")
        );
      }

      const { subevent_id } = passSubEvent;

      const subEventPasses = await PassSubEvent.findAll({
        where: { subevent_id },
        attributes: ["pass_id"],
      });

      const passIds = subEventPasses.map((p) => p.pass_id);

      const duplicateCategoryPass = await Pass.findOne({
        where: {
          pass_id: passIds,
          category,
        },
      });

      if (duplicateCategoryPass && duplicateCategoryPass.pass_id !== passId) {
        return next(
          new ApiError(
            400,
            `A pass with category '${category}' already exists for this subevent`
          )
        );
      }
    }

    if (category) pass.category = category;

    if (total_price !== undefined) pass.total_price = total_price;

    if (discount_percentage !== undefined)
      pass.discount_percentage = discount_percentage;

    if (validity !== undefined) pass.validity = validity;

    await pass.save();

    return res
      .status(200)
      .json(new ApiResponse(200, "Pass updated successfully", pass));
  } catch (error) {
    return next(new ApiError(500, error.message || "Internal Server Error"));
  }
});

const getAllPassForSubevent = asyncHandler(async (req, res, next) => {
  try {

    const { subeventId } = req.params;

    if (!subeventId) {
      return next(new ApiError(400, "SubEvent ID is required"));
    }

    const passSubEvents = await PassSubEvent.findAll({
      where: { subevent_id: subeventId },
      attributes: ["pass_id"],
    });

    const passIds = passSubEvents.map((pse) => pse?.pass_id);

    const passes = passIds.length
      ? await Pass.findAll({
          where: { pass_id: passIds, is_global: false },
          attributes: [
            "pass_id",
            "category",
            "total_price",  
            "discount_percentage",
            "final_price",
            "validity",
            "is_active",
          ],
        })
      : [];

    return res
      .status(200)
      .json(
        new ApiResponse(
          200, 
          "Passes retrieved successfully",
          {
            subevent_id: subeventId,
            passes,
          } 
        )
      );

  } catch (error) {
    return next(new ApiError(500, error.message || "Internal Server Error"));
  }
});

export {
  createNewPass,
  deletePass,
  updatePass,
  getPassById,
  getAllPassForSubevent,
};
