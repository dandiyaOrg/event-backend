import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Pass, SubEvent, PassSubEvent, Event } from "../db/models/index.js";
import { Op } from "sequelize";
import { logger } from "../app.js";
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

    logger.debug(
      `Creating new pass | category: ${category}, event_id: ${event_id}, subevent_id: ${subevent_id}, is_global: ${is_global}`
    );

    const isGlobalBool =
      typeof is_global === "string"
        ? is_global.toLowerCase() === "true"
        : Boolean(is_global);

    if (isGlobalBool) {
      logger.info("Processing global pass creation...");

      if (!event_id) {
        logger.warn("Global pass creation failed: event_id missing");
        return next(
          new ApiError(400, "event_id is required when is_global is true")
        );
      }

      const event = await Event.findByPk(event_id);
      if (!event) {
        logger.warn(`Global pass creation failed: Event ${event_id} not found`);
        return next(new ApiError(400, `Event with id ${event_id} not found`));
      }

      const subevents = await SubEvent.findAll({ where: { event_id } });

      if (subevents.length < event.number_of_days) {
        logger.warn(
          `Global pass creation failed: subevents(${subevents.length}) < event.number_of_days(${event.number_of_days})`
        );
        return next(
          new ApiError(
            400,
            `Cannot create global pass: number of subevents (${subevents.length}) is less than event.number_of_days (${event.number_of_days})`
          )
        );
      }

      const existingGlobalPass = await Pass.findOne({
        where: {
          is_global: true,
          is_active: true,
        },
        include: [
          {
            model: PassSubEvent,
            as: "passSubEvents",
            where: {
              subevent_id: {
                [Op.in]: subevents.map((se) => se.subevent_id),
              },
            },
            required: true,
          },
        ],
      });

      if (existingGlobalPass) {
        logger.warn(
          `Global pass creation failed: Already exists for event ${event_id}`
        );
        return next(
          new ApiError(
            400,
            "A global pass already exists for this event. Cannot create duplicate."
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

      logger.info(
        `Global pass created successfully | pass_id: ${pass.pass_id}, linked subevents: ${subevents.length}`
      );

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
      logger.info("Processing non-global pass creation...");

      if (!subevent_id) {
        logger.warn("Non-global pass creation failed: subevent_id missing");
        return next(
          new ApiError(400, "subevent_id is required when is_global is false")
        );
      }

      const subEvent = await SubEvent.findByPk(subevent_id);
      if (!subEvent) {
        logger.warn(
          `Non-global pass creation failed: Subevent ${subevent_id} not found`
        );
        return next(
          new ApiError(
            400,
            `Subevent with the given subevent id ${subevent_id} not found`
          )
        );
      }

      const existingPass = await PassSubEvent.findOne({
        where: { subevent_id },
        include: [
          {
            model: Pass,
            as: "pass",
            where: { category },
            required: true,
          },
        ],
      });

      if (existingPass) {
        logger.warn(
          `Non-global pass creation failed: Duplicate category "${category}" for subevent ${subevent_id}`
        );
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

      await PassSubEvent.create({
        pass_id: pass.pass_id,
        subevent_id,
      });

      logger.info(
        `Non-global pass created successfully | pass_id: ${pass.pass_id}, subevent_id: ${subevent_id}`
      );

      const data = pass.get({ plain: true });
      return res
        .status(200)
        .json(new ApiResponse(200, { data }, "Pass Created Successfully"));
    }
  } catch (error) {
    logger.error(`Error creating pass: ${error.message}`, {
      stack: error.stack,
    });
    return next(
      new ApiError(500, error.message || "Internal Server Error", error)
    );
  }
});


const deletePass = asyncHandler(async (req, res, next) => {
  try {
    const { passId } = req.params;

    logger.debug(`Delete pass request received | passId: ${passId}`);

    if (!passId) {
      logger.warn("Delete pass failed: passId missing in request params");
      return next(new ApiError(400, "Pass ID is required"));
    }

    const pass = await Pass.findByPk(passId);
    if (!pass) {
      logger.warn(`Delete pass failed: Pass not found | passId: ${passId}`);
      return next(new ApiError(404, "Pass not found"));
    }

    if (pass.is_active) {
      logger.warn(
        `Delete pass denied: Pass is active | passId: ${passId}, category: ${pass.category}`
      );
      return next(new ApiError(400, "You cannot delete an activated pass"));
    }

    await pass.destroy();

    logger.info(`Pass deleted successfully | passId: ${passId}`);

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Pass deleted successfully"));
  } catch (error) {
    logger.error(`Error deleting pass: ${error.message}`, { stack: error.stack });
    return next(new ApiError(500, error.message || "Internal Server Error", error));
  }
});


const getPassById = asyncHandler(async (req, res, next) => {
  try {
    const { passId } = req.params;

    logger.debug(`Get pass by ID request received | passId: ${passId}`);

    if (!passId) {
      logger.warn("Get pass by ID failed: passId missing in request params");
      return next(new ApiError(400, "Pass ID is required"));
    }

    const pass = await Pass.findByPk(passId);
    if (!pass) {
      logger.warn(`Get pass by ID failed: Pass not found | passId: ${passId}`);
      return next(new ApiError(404, "Pass not found"));
    }

    const passSubEvents = await PassSubEvent.findAll({
      where: { pass_id: passId },
      attributes: ["subevent_id"],
    });

    const subeventIds = passSubEvents.map((entry) => entry.subevent_id);

    logger.debug(
      `Found ${subeventIds.length} subevents linked to pass | passId: ${passId}`
    );

    const subevents = await SubEvent.findAll({
      where: { subevent_id: subeventIds },
      attributes: ["subevent_id", "name"],
    });

    logger.info(
      `Pass retrieved successfully | passId: ${passId}, subevents: ${subevents.length}`
    );

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
    logger.error(`Error retrieving pass by ID: ${error.message}`, {
      stack: error.stack,
    });
    return next(new ApiError(500, error.message || "Internal Server Error", error));
  }
});


const togglePass = asyncHandler(async (req, res, next) => {
  try {
    const { passId } = req.params;

    logger.debug(`Toggle pass request received | passId: ${passId}`);

    if (!passId) {
      logger.warn("Toggle pass failed: passId missing in request params");
      return next(new ApiError(400, "Pass ID is required"));
    }

    const pass = await Pass.findByPk(passId);

    if (!pass) {
      logger.warn(`Toggle pass failed: Pass not found | passId: ${passId}`);
      return next(new ApiError(404, `Pass not found with Id ${passId}`));
    }

    pass.is_active = !pass.is_active;
    await pass.save();

    logger.info(
      `Pass toggled successfully | passId: ${passId}, new_state: ${
        pass.is_active ? "activated" : "deactivated"
      }`
    );

    return res.status(200).json({
      status: "success",
      message: `Pass has been ${pass.is_active ? "activated" : "deactivated"}.`,
      data: pass,
    });
  } catch (error) {
    logger.error(`Error toggling pass: ${error.message}`, { stack: error.stack });
    return next(new ApiError(500, error.message || "Internal Server Error", error));
  }
});

const updatePass = asyncHandler(async (req, res, next) => {
  try {
    const { passId } = req.params;
    const { discount_percentage } = req.body;

    logger.debug(
      `Update pass request received | passId: ${passId}, discount_percentage: ${discount_percentage}`
    );

    if (!passId) {
      logger.warn("Update pass failed: passId missing in request params");
      return next(new ApiError(400, "Pass ID is required"));
    }

    const pass = await Pass.findByPk(passId);
    if (!pass) {
      logger.warn(`Update pass failed: Pass not found | passId: ${passId}`);
      return next(new ApiError(404, "Pass not found"));
    }

    pass.discount_percentage = discount_percentage;
    await pass.save();

    const data = pass.get({ plain: true });

    logger.info(
      `Pass updated successfully | passId: ${passId}, new_discount: ${discount_percentage}`
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        { pass: { ...data } },
        "Discount Percentage for pass updated successfully"
      )
    );
  } catch (error) {
    logger.error(`Error updating pass: ${error.message}`, { stack: error.stack });
    return next(new ApiError(500, error.message || "Internal Server Error", error));
  }
});


const getAllPassForSubevent = asyncHandler(async (req, res, next) => {
  try {
    const { subeventId } = req.params;

    logger.debug(`Get all passes for subevent request received | subeventId: ${subeventId}`);

    if (!subeventId) {
      logger.warn("Get all passes for subevent failed: subeventId missing in request params");
      return next(new ApiError(400, "SubEvent ID is required"));
    }

    const passSubEvents = await PassSubEvent.findAll({
      where: { subevent_id: subeventId },
      attributes: ["pass_id"],
      raw: true, // returns plain objects instead of model instances
    });

    const passIds = passSubEvents.map((pse) => pse.pass_id);

    logger.debug(
      `Found ${passIds.length} passes linked to subevent | subeventId: ${subeventId}`
    );

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

    logger.info(
      `Retrieved ${passes.length} non-global passes for subevent | subeventId: ${subeventId}`
    );

    return res.status(200).json(
      new ApiResponse(200, "Passes retrieved successfully", {
        subevent_id: subeventId,
        passes,
      })
    );
  } catch (error) {
    logger.error(`Error retrieving passes for subevent: ${error.message}`, {
      stack: error.stack,
    });
    return next(new ApiError(500, error.message || "Internal Server Error", error));
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
