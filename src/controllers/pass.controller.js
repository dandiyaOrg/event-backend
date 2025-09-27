import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {
  Pass,
  SubEvent,
  PassSubEvent,
  Event,
  sequelize,
} from "../db/models/index.js";
import { Op } from "sequelize";
import { logger } from "../app.js";
import { convertToDateOnlyIST } from "../services/dateconversion.service.js";
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
      typeof is_global === "boolean"
        ? is_global
        : is_global !== undefined && is_global !== null
          ? typeof is_global === "string"
            ? is_global.toLowerCase() === "true"
            : Boolean(is_global)
          : false;
    if (isGlobalBool) {
      if (!category.toLowerCase().includes("full")) {
        logger.warn(
          "Global pass creation failed: category must include 'Full'"
        );
        return next(
          new ApiError(
            400,
            "Category for global pass must include 'Full' (e.g., 'Full Stag Male')"
          )
        );
      }
    } else {
      if (category.toLowerCase().includes("full")) {
        logger.warn(
          "Non-global pass creation failed: category must NOT include 'Full'"
        );
        return next(
          new ApiError(
            400,
            "Category for non-global passes cannot include 'Full'"
          )
        );
      }
    }
    if (isGlobalBool) {
      if (!event_id) {
        logger.warn("Global pass creation failed: event_id missing");
        return next(
          new ApiError(400, "event_id is required when is_global is true")
        );
      }
      const subevents = await SubEvent.findAll({
        where: { event_id },
        order: [["date", "ASC"]],
      });

      if (!subevents || subevents.length === 0) {
        logger.warn(
          `Global pass creation failed: no subevents found for event ${event_id}`
        );
        return next(new ApiError(400, "No subevents found for this event"));
      }
      const todayStr = convertToDateOnlyIST(new Date());

      // remaining subevents are those with date >= today (treat today as remaining)
      const remainingSubevents = subevents.filter((se) => {
        const seDateStr = se.date ? convertToDateOnlyIST(se.date) : null;
        return seDateStr && seDateStr >= todayStr;
      });

      const remainingIds = remainingSubevents.map((s) => s.subevent_id);
      logger.info("GLOBAL PASS DEBUG | remainingSubevents count", {
        event_id,
        remainingCount: remainingIds.length,
        remainingIds,
        todayStr,
      });
      if (remainingIds.length === 0) {
        logger.warn(
          `Global pass creation failed: no remaining subevents for event ${event_id}`
        );
        return next(
          new ApiError(
            400,
            "No remaining subevents to create a global pass for"
          )
        );
      }
      await sequelize
        .transaction(async (t) => {
          // find active global passes that include any of the remaining subevents
          const overlappingActivePasses = await Pass.findAll({
            where: {
              is_global: true,
              is_active: true,
              category,
            },
            include: [
              {
                model: PassSubEvent,
                as: "passSubEvents",
                where: {
                  subevent_id: { [Op.in]: remainingIds },
                },
                required: true,
              },
            ],
            transaction: t,
            lock: t.LOCK.UPDATE, // lock selected rows to avoid race
          });

          if (overlappingActivePasses && overlappingActivePasses.length > 0) {
            // deactivate those old passes (business decision: automatically deactivate)
            const overlappingIds = overlappingActivePasses.map(
              (p) => p.pass_id
            );
            logger.info(
              `Deactivating ${overlappingIds.length} existing active global pass(es) (${overlappingIds.join(
                ","
              )}) that cover remaining subevents for event ${event_id}`
            );

            await Pass.update(
              { is_active: false },
              {
                where: { pass_id: { [Op.in]: overlappingIds } },
                transaction: t,
              }
            );
          }

          // After deactivating previous active passes, recompute coverage of remaining subevents
          // (This ensures we don't block creation because of pre-existing active coverage.)
          const coveredPassSubEvents = await PassSubEvent.findAll({
            where: {
              subevent_id: { [Op.in]: remainingIds },
            },
            include: [
              {
                model: Pass,
                as: "pass",
                where: { is_global: true, is_active: true, category },
                required: true,
              },
              {
                model: SubEvent,
                as: "subevent",
                where: {
                  date: { [Op.gte]: todayStr },
                  event_id,
                },
                required: true,
              },
            ],
            transaction: t,
            lock: t.LOCK.SHARE, // shared lock while reading
          });

          const coveredSet = new Set(
            coveredPassSubEvents.map((p) => p.subevent_id)
          );
          const uncoveredRemainingIds = remainingIds.filter(
            (id) => !coveredSet.has(id)
          );
          logger.info("GLOBAL PASS DEBUG | coverage result", {
            coveredCount: coveredSet.size,
            coveredIds: Array.from(coveredSet),
            uncoveredCount: uncoveredRemainingIds.length,
            uncoveredRemainingIds,
          });

          // enforce your business rules
          if (uncoveredRemainingIds.length === 0) {
            logger.warn(
              `Global pass creation failed (after deactivating): active global pass(es) already cover all remaining subevents for event ${event_id}`
            );
            throw new ApiError(
              400,
              "Cannot create global pass: an active global pass already covers all remaining subevents."
            ); // thrown inside transaction -> will rollback
          }

          if (uncoveredRemainingIds.length <= 1) {
            logger.warn(
              `Global pass creation failed: uncovered remaining subevents (${uncoveredRemainingIds.length}) <= 1`
            );
            throw new ApiError(
              400,
              "Cannot create global pass: not enough uncovered remaining subevents (<=1)"
            );
          }

          // determine validity
          const providedValidity =
            validity !== undefined && validity !== null
              ? Number(validity)
              : undefined;
          const passValidity =
            providedValidity !== undefined && !Number.isNaN(providedValidity)
              ? providedValidity
              : (uncoveredRemainingIds.length ?? 1);

          if (passValidity > uncoveredRemainingIds.length) {
            logger.warn(
              `Global pass creation failed: requested validity (${passValidity}) exceeds uncovered remaining subevents (${uncoveredRemainingIds.length})`
            );
            throw new ApiError(
              400,
              `Validity cannot exceed number of uncovered remaining subevents (${uncoveredRemainingIds.length}).`
            );
          }

          // create pass and link to uncovered remaining subevents
          const pass = await Pass.create(
            {
              category,
              total_price,
              discount_percentage,
              validity: passValidity,
              is_active: is_active ?? false,
              is_global: true,
            },
            { transaction: t }
          );

          const passSubEventEntries = uncoveredRemainingIds.map((sid) => ({
            pass_id: pass.pass_id,
            subevent_id: sid,
          }));

          await PassSubEvent.bulkCreate(passSubEventEntries, {
            ignoreDuplicates: true,
            transaction: t,
          });

          logger.info(
            `Global pass created successfully | pass_id: ${pass.pass_id}, linked uncovered remaining subevents: ${uncoveredRemainingIds.length}`
          );

          // return data (this return value becomes the resolved value of sequelize.transaction)
          const data = pass.get({ plain: true });
          return data;
        }) // end transaction
        .then((data) => {
          return res
            .status(200)
            .json(
              new ApiResponse(
                200,
                { data },
                "Global Pass Created and linked to uncovered remaining subevents"
              )
            );
        })
        .catch((err) => {
          // If err is ApiError we pass it to next, else convert to 500
          if (err instanceof ApiError) return next(err);
          logger.error("Error creating global pass", {
            stack: err.stack,
            message: err.message,
          });
          return next(new ApiError(500, "Internal Server Error", err));
        });
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
    logger.error(`Error deleting pass: ${error.message}`, {
      stack: error.stack,
    });
    return next(
      new ApiError(500, error.message || "Internal Server Error", error)
    );
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
    return next(
      new ApiError(500, error.message || "Internal Server Error", error)
    );
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

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { pass },
          `Pass has been ${pass.is_active ? "activated" : "deactivated"}.`
        )
      );
  } catch (error) {
    logger.error(`Error toggling pass: ${error.message}`, {
      stack: error.stack,
    });
    return next(
      new ApiError(500, error.message || "Internal Server Error", error)
    );
  }
});

const updatePass = asyncHandler(async (req, res, next) => {
  try {
    const { passId } = req.params;
    const { discount_percentage, total_price } = req.body;

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

    const hasDiscount = Object.prototype.hasOwnProperty.call(
      req.body,
      "discount_percentage"
    );
    const hasTotal = Object.prototype.hasOwnProperty.call(
      req.body,
      "total_price"
    );

    if (!hasDiscount && !hasTotal) {
      logger.warn("Update pass failed: no updatable fields provided");
      return next(
        new ApiError(
          400,
          "Provide at least one of 'discount_percentage' or 'total_price' in the request body"
        )
      );
    }
    const updates = {};
    if (hasDiscount) {
      if (discount_percentage === null || discount_percentage === "") {
        return next(
          new ApiError(
            400,
            "discount_percentage must be a number between 0 and 100"
          )
        );
      }
      const discNum = Number(discount_percentage);
      if (Number.isNaN(discNum)) {
        return next(
          new ApiError(400, "discount_percentage must be a valid number")
        );
      }
      if (discNum < 0 || discNum > 100) {
        return next(
          new ApiError(400, "discount_percentage must be between 0 and 100")
        );
      }
      updates.discount_percentage = discNum;
    }

    if (hasTotal) {
      if (total_price === null || total_price === "") {
        return next(
          new ApiError(400, "total_price must be a non-negative number")
        );
      }
      const totalNum = Number(total_price);
      if (Number.isNaN(totalNum)) {
        return next(new ApiError(400, "total_price must be a valid number"));
      }
      if (totalNum < 0) {
        return next(new ApiError(400, "total_price must be >= 0"));
      }
      updates.total_price = totalNum;
    }

    // Apply updates and save
    Object.assign(pass, updates);
    await pass.save();
    const data = pass.get({ plain: true });

    logger.info(
      `Pass updated successfully | passId: ${passId}, updates: ${JSON.stringify(updates)}`
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, { pass: { ...data } }, "Pass updated successfully")
      );
  } catch (error) {
    logger.error(`Error updating pass: ${error.message}`, {
      stack: error.stack,
    });
    return next(
      new ApiError(500, error.message || "Internal Server Error", error)
    );
  }
});

const getAllPassForSubevent = asyncHandler(async (req, res, next) => {
  try {
    const { subeventId } = req.params;

    logger.debug(
      `Get all passes for subevent request received | subeventId: ${subeventId}`
    );

    if (!subeventId) {
      logger.warn(
        "Get all passes for subevent failed: subeventId missing in request params"
      );
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
    return next(
      new ApiError(500, error.message || "Internal Server Error", error)
    );
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

// // make sure at top of file:
// // import { Op } from "sequelize";
// // and convertToDateOnlyIST is defined and returns 'YYYY-MM-DD'

// if (isGlobalBool) {
//   if (!event_id) {
//     logger.warn("Global pass creation failed: event_id missing");
//     return next(new ApiError(400, "event_id is required when is_global is true"));
//   }

//   const subevents = await SubEvent.findAll({
//     where: { event_id },
//     order: [["date", "ASC"]],
//   });

//   if (!subevents || subevents.length === 0) {
//     logger.warn(`Global pass creation failed: no subevents found for event ${event_id}`);
//     return next(new ApiError(400, "No subevents found for this event"));
//   }

//   const todayStr = convertToDateOnlyIST(new Date());

//   // remaining subevents are those with date >= today (today counts as remaining)
//   const remainingSubevents = subevents.filter((se) => {
//     const seDateStr = se.date ? convertToDateOnlyIST(se.date) : null;
//     return seDateStr && seDateStr >= todayStr;
//   });

//   const remainingIds = remainingSubevents.map((s) => s.subevent_id);

//   if (remainingIds.length === 0) {
//     logger.warn(`Global pass creation failed: no remaining subevents for event ${event_id}`);
//     return next(new ApiError(400, "No remaining subevents to create a global pass for"));
//   }

//   // Check if there are any active global passes that cover the remaining subevents
//   // We'll deactivate them so the new pass can become the active pass for the remaining days.
//   await sequelize.transaction(async (t) => {
//     // find active global passes that include any of the remaining subevents
//     const overlappingActivePasses = await Pass.findAll({
//       where: {
//         is_global: true,
//         is_active: true,
//       },
//       include: [
//         {
//           model: PassSubEvent,
//           as: "passSubEvents",
//           where: {
//             subevent_id: { [Op.in]: remainingIds },
//           },
//           required: true,
//         },
//       ],
//       transaction: t,
//       lock: t.LOCK.UPDATE, // lock selected rows to avoid race
//     });

//     if (overlappingActivePasses && overlappingActivePasses.length > 0) {
//       // deactivate those old passes (business decision: automatically deactivate)
//       const overlappingIds = overlappingActivePasses.map((p) => p.pass_id);
//       logger.info(
//         `Deactivating ${overlappingIds.length} existing active global pass(es) (${overlappingIds.join(
//           ","
//         )}) that cover remaining subevents for event ${event_id}`
//       );

//       await Pass.update(
//         { is_active: false },
//         {
//           where: { pass_id: { [Op.in]: overlappingIds } },
//           transaction: t,
//         }
//       );
//     }

//     // After deactivating previous active passes, recompute coverage of remaining subevents
//     // (This ensures we don't block creation because of pre-existing active coverage.)
//     const coveredPassSubEvents = await PassSubEvent.findAll({
//       where: {
//         subevent_id: { [Op.in]: remainingIds },
//       },
//       include: [
//         {
//           model: Pass,
//           as: "pass",
//           where: { is_global: true, is_active: true },
//           required: true,
//         },
//         {
//           model: SubEvent,
//           as: "subevent",
//           where: {
//             date: { [Op.gte]: todayStr },
//             event_id,
//           },
//           required: true,
//         },
//       ],
//       transaction: t,
//       lock: t.LOCK.SHARE, // shared lock while reading
//     });

//     const coveredSet = new Set(coveredPassSubEvents.map((p) => p.subevent_id));
//     const uncoveredRemainingIds = remainingIds.filter((id) => !coveredSet.has(id));

//     // enforce your business rules
//     if (uncoveredRemainingIds.length === 0) {
//       logger.warn(
//         `Global pass creation failed (after deactivating): active global pass(es) already cover all remaining subevents for event ${event_id}`
//       );
//       throw new ApiError(
//         400,
//         "Cannot create global pass: an active global pass already covers all remaining subevents."
//       ); // thrown inside transaction -> will rollback
//     }

//     if (uncoveredRemainingIds.length <= 1) {
//       logger.warn(
//         `Global pass creation failed: uncovered remaining subevents (${uncoveredRemainingIds.length}) <= 1`
//       );
//       throw new ApiError(
//         400,
//         "Cannot create global pass: not enough uncovered remaining subevents (<=1)"
//       );
//     }

//     // determine validity
//     const providedValidity =
//       validity !== undefined && validity !== null ? Number(validity) : undefined;
//     const passValidity =
//       providedValidity !== undefined && !Number.isNaN(providedValidity)
//         ? providedValidity
//         : uncoveredRemainingIds.length ?? 1;

//     if (passValidity > uncoveredRemainingIds.length) {
//       logger.warn(
//         `Global pass creation failed: requested validity (${passValidity}) exceeds uncovered remaining subevents (${uncoveredRemainingIds.length})`
//       );
//       throw new ApiError(
//         400,
//         `Validity cannot exceed number of uncovered remaining subevents (${uncoveredRemainingIds.length}).`
//       );
//     }

//     // create pass and link to uncovered remaining subevents
//     const pass = await Pass.create(
//       {
//         category,
//         total_price,
//         discount_percentage,
//         validity: passValidity,
//         is_active: is_active ?? false,
//         is_global: true,
//       },
//       { transaction: t }
//     );

//     const passSubEventEntries = uncoveredRemainingIds.map((sid) => ({
//       pass_id: pass.pass_id,
//       subevent_id: sid,
//     }));

//     await PassSubEvent.bulkCreate(passSubEventEntries, {
//       ignoreDuplicates: true,
//       transaction: t,
//     });

//     logger.info(
//       `Global pass created successfully | pass_id: ${pass.pass_id}, linked uncovered remaining subevents: ${uncoveredRemainingIds.length}`
//     );

//     // return data (this return value becomes the resolved value of sequelize.transaction)
//     const data = pass.get({ plain: true });
//     return data;
//   }) // end transaction
//     .then((data) => {
//       return res
//         .status(200)
//         .json(new ApiResponse(200, { data }, "Global Pass Created and linked to uncovered remaining subevents"));
//     })
//     .catch((err) => {
//       // If err is ApiError we pass it to next, else convert to 500
//       if (err instanceof ApiError) return next(err);
//       logger.error("Error creating global pass", { stack: err.stack, message: err.message });
//       return next(new ApiError(500, "Internal Server Error", err));
//     });
// } // end if isGlobalBool
