import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Pass, SubEvent, PassSubEvent } from "../db/models/index.js";

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
    const {
      category,
      total_price,
      discount_percentage,
      validity,
      event_id,
      subevent_id,
      is_global,
      is_active,
    } = req.body;
    if (is_global) {
      if (!event_id) {
        return next(
          new ApiError(400, "event_id is required when is_global is true")
        );
      }
      const event = await Event.findByPk(event_id);
      if (!event) {
        return next(new ApiError(400, `Event with id ${event_id} not found`));
      }
      const subevents = await SubEvent.findAll({ where: { event_id } });

      if (subevents.length < event.number_of_days) {
        return next(
          new ApiError(
            400,
            `Cannot create global pass: number of subevents (${subevents.length}) is less than event.number_of_days (${event.number_of_days})`
          )
        );
      }
      const passValidity = validity ?? event.number_of_days ?? 1;
      const pass = await Pass.create({
        category: "Group",
        total_price,
        discount_percentage,
        validity: passValidity,
        is_active: is_active ?? false,
        is_global: true,
      });
      const passSubEventEntries = subevents.map((subev) => ({
        pass_id: pass.pass_id,
        subevent_id: subev.subevent_id,
      }));

      await PassSubEvent.bulkCreate(passSubEventEntries, {
        ignoreDuplicates: true,
      });
      const data = pass.get({ plain: true });
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { data },
            "Global Pass Created and linked to all subevents"
          )
        );
    } else {
      // Non-global pass flow: subevent_id is required
      if (!subevent_id) {
        return next(
          new ApiError(400, "subevent_id is required when is_global is false")
        );
      }
      const subEvent = await SubEvent.findByPk(subevent_id);
      if (!subEvent) {
        return next(
          new ApiError(
            400,
            `Subevent with the given subevent id ${subevent_id} not found`
          )
        );
      }

      // Check duplicate pass category for this subevent
      const existingPass = await PassSubEvent.findOne({
        where: { subevent_id },
        include: [
          {
            model: Pass,
            where: { category },
            required: true,
          },
        ],
      });

      if (existingPass) {
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
        validity: validity ?? 1,
        is_active: is_active ?? false,
        is_global: false,
      });

      // Link the pass to this subevent
      await PassSubEvent.create({
        pass_id: pass.pass_id,
        subevent_id,
      });

      const data = pass.get({ plain: true });
      return res
        .status(200)
        .json(new ApiResponse(200, { data }, "Pass Created Successfully"));
    }
  } catch (error) {
    return next(
      new ApiError(500, error.message || "Internal Server Error", error)
    );
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
      .json(new ApiResponse(200, {}, "Pass deleted successfully"));
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

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          pass,
          subevents,
        },
        "Pass retrieved successfully"
      )
    );
  } catch (error) {
    return next(new ApiError(500, error.message || "Internal Server Error"));
  }
});

const togglePass = asyncHandler(async (req, res, next) => {
  try {
    const { passId } = req.params;

    if (!passId) {
      return next(new ApiError(400, "Pass ID is required"));
    }

    const pass = await Pass.findByPk(passId);

    if (!pass) {
      return next(new ApiError(404, `Pass not found with Id ${passId}`));
    }
    pass.is_active = !pass.is_active;
    await pass.save();
    return res.status(200).json({
      status: "success",
      message: `Pass has been ${pass.is_active ? "activated" : "deactivated"}.`,
      data: pass,
    });
  } catch (error) {
    return next(new ApiError(500, error.message || "Internal Server Error"));
  }
});
const updatePass = asyncHandler(async (req, res, next) => {
  try {
    const { passId } = req.params;
    const { discount_percentage } = req.body;

    if (!passId) {
      return next(new ApiError(400, "Pass ID is required"));
    }

    const pass = await Pass.findByPk(passId);
    if (!pass) {
      return next(new ApiError(404, "Pass not found"));
    }
    pass.discount_percentage = discount_percentage;
    await pass.save();

    const data = pass.get({ plain: true });
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { pass: { ...data } },
          "Discoutn Percentage for pass updated successfullyully"
        )
      );
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

    return res.status(200).json(
      new ApiResponse(200, "Passes retrieved successfully", {
        subevent_id: subeventId,
        passes,
      })
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
  togglePass,
};
