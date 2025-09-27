import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {
  BillingUser,
  Event,
  PassSubEvent,
  SubEvent,
  Pass,
  Order,
  OrderItem,
  SubEventAttendee,
  OrderItemAttendee,
  Attendee,
  Transaction,
  IssuedPass,
  sequelize,
  EventBillingUsers,
} from "../db/models/index.js";
import { Op } from "sequelize";
import { logger } from "../app.js";
import { sendMail, dataUrlToAttachment } from "../utils/sendMail.js";
import { generateQR } from "../services/qrGenerator.service.js";
import {
  convertToDateOnlyIST,
  formatExpiryForEmail,
  getDateIST,
} from "../services/dateconversion.service.js";
import { createPayment } from "../services/payment.service.js";

const createBillingUser = asyncHandler(async (req, res, next) => {
  try {
    const { name, mobile_no, whatsapp, email, address, dob, gender, event_id } =
      req.body;

    logger.debug(
      `createBillingUser request received with event_id: ${event_id}, email: ${email}`
    );

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedMobile = String(mobile_no).trim();

    const event = await Event.findByPk(event_id);
    if (!event) {
      logger.warn(`Event not found for event_id: ${event_id}`);
      return next(
        new ApiError(
          400,
          `Event with the given eventId ${event_id} doesn't exist`
        )
      );
    }

    let billingUser = await BillingUser.findOne({
      where: { mobile_no: normalizedMobile, email: normalizedEmail },
    });

    if (!billingUser) {
      billingUser = await BillingUser.create({
        name,
        mobile_no: normalizedMobile,
        whatsapp,
        email: normalizedEmail,
        address,
        dob,
        gender,
        admin_id: event.admin_id,
      });
      logger.info(
        `Billing user created successfully with email: ${normalizedEmail}`
      );
    } else {
      logger.info(`Billing user already exists with email: ${normalizedEmail}`);
    }

    if (!billingUser) {
      logger.error(
        `Failed to create billing user for email: ${normalizedEmail}`
      );
      return next(new ApiError(500, "Failed to create billingUser"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { billingUser },
          "Billing user found or created successfully"
        )
      );
  } catch (error) {
    logger.error("Internal Server Error in createBillingUser", {
      stack: error.stack,
    });
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const createGlobalPassOrderForBillingUser = asyncHandler(
  async (req, res, next) => {
    const {
      event_id,
      billing_user_id,
      total_amount,
      attendees,
      sendAllToBilling,
    } = req.body;

    logger.debug(
      `createGlobalPassOrderForBillingUser request received for event_id: ${event_id}, billing_user_id: ${billing_user_id}`
    );

    const t = await sequelize.transaction();
    try {
      // 1. Validate event existence and status
      const event = await Event.findOne({
        where: { event_id, is_active: true },
        transaction: t,
      });
      if (!event) {
        logger.warn(`Event not found or inactive for event_id: ${event_id}`);
        await t.rollback();
        return next(new ApiError(404, "Event not found or inactive"));
      }

      // 2) Validate billing user exists
      const billingUser = await BillingUser.findByPk(billing_user_id, {
        transaction: t,
      });
      if (!billingUser) {
        logger.warn(`BillingUser not found for id: ${billing_user_id}`);
        await t.rollback();
        return next(new ApiError(404, "Billing User not found for this order"));
      }

      // validate attendees array
      if (!Array.isArray(attendees) || attendees.length === 0) {
        await t.rollback();
        return next(new ApiError(400, "Attendees array is required"));
      }

      // 3) Compute remaining subevents (date >= today) for the event
      const allSubevents = await SubEvent.findAll({
        where: { event_id },
        attributes: ["subevent_id", "date"],
        order: [["date", "ASC"]],
        transaction: t,
      });

      if (!allSubevents || allSubevents.length === 0) {
        logger.warn(`No subevents found for event ${event_id}`);
        await t.rollback();
        return next(new ApiError(404, "No subevents found for this event"));
      }

      const todayStr = convertToDateOnlyIST(new Date());
      const remainingSubevents = allSubevents.filter((s) => {
        const seDateStr = s.date ? convertToDateOnlyIST(s.date) : null;
        return seDateStr && seDateStr >= todayStr;
      });
      const remainingIds = remainingSubevents.map((s) => s.subevent_id);

      if (remainingIds.length === 0 || remainingIds.length == 1) {
        logger.warn(`No remaining global subevents for this event ${event_id}`);
        await t.rollback();
        return next(
          new ApiError(400, "No remaining global subevents for this event ")
        );
      }

      // -------------------------
      // Build pass -> attendee list map (we need attendee arrays to handle couple pairing)
      // -------------------------
      const passToAttendees = new Map();
      for (const attendee of attendees) {
        if (!attendee.pass_id) {
          logger.warn("pass_id missing for an attendee");
          await t.rollback();
          return next(
            new ApiError(400, "pass_id is required for each attendee")
          );
        }
        const list = passToAttendees.get(attendee.pass_id) || [];
        list.push(attendee);
        passToAttendees.set(attendee.pass_id, list);
      }
      const passIds = Array.from(passToAttendees.keys());

      // 5) Fetch all passes to check prices and ensure they are global & active
      const passes = await Pass.findAll({
        where: {
          pass_id: passIds,
          is_active: true,
        },
        transaction: t,
      });

      if (passes.length !== passToAttendees.size) {
        logger.warn("One or more passes are invalid or inactive");
        await t.rollback();
        return next(
          new ApiError(400, "One or more passes are invalid or inactive")
        );
      }

      // Determine couple passes. Assumption: either pass.is_couple === true OR category contains 'couple' (case-insensitive)
      const isCouplePass = (pass) =>
        pass.is_couple === true ||
        (typeof pass.category === "string" &&
          pass.category.toLowerCase().includes("couple"));
      const isGroupPass = (pass) =>
        pass.is_group === true ||
        (typeof pass.category === "string" &&
          pass.category.toLowerCase().includes("group"));
      // 6) For each pass ensure it covers ALL remaining subevents (and for couple passes ensure pairing)
      // Fetch PassSubEvent counts grouped by pass_id to verify coverage in bulk
      const passSubEventRows = await PassSubEvent.findAll({
        where: { pass_id: passIds, subevent_id: { [Op.in]: remainingIds } },
        attributes: [
          "pass_id",
          [sequelize.fn("COUNT", sequelize.col("subevent_id")), "covered"],
        ],
        group: ["pass_id"],
        raw: true,
        transaction: t,
      });
      const coveredMap = new Map(
        passSubEventRows.map((r) => [r.pass_id, Number(r.covered)])
      );

      // qtyMap will contain number of _units_ for each pass (for couple -> number of pairs)
      const qtyMap = new Map();

      for (const pass of passes) {
        const pid = pass.pass_id;
        const cov = coveredMap.get(pid) || 0;
        if (cov < remainingIds.length) {
          logger.warn(
            `Pass ${pid} does not cover all remaining subevents for event ${event_id} (covers ${cov}/${remainingIds.length})`
          );
          await t.rollback();
          return next(
            new ApiError(
              400,
              `Selected pass ${pid} is not valid for all remaining subevents of this event`
            )
          );
        }

        // compute qty based on number of attendees for this pass
        const attendeesForPass = passToAttendees.get(pid) || [];
        if (!attendeesForPass.length) {
          qtyMap.set(pid, 0);
          continue;
        }
        if (isGroupPass(pass)) {
          // Group pass: single pass covers all attendees, no per-attendee calculation
          qtyMap.set(pid, 1); // Always 1 unit for group passes
          calculatedTotal += parseFloat(pass.final_price); // Single pass price regardless of attendee count

          logger.info(
            `Group pass ${pid} applied for ${attendeeList.length} attendees at single price: ${pass.final_price}`
          );
        } else if (isCouplePass(pass)) {
          // Couple pass: require even number of attendees and pair genders
          if (attendeesForPass.length % 2 !== 0) {
            logger.warn(
              `Odd number of attendees (${attendeesForPass.length}) for couple pass ${pid}`
            );
            await t.rollback();
            return next(
              new ApiError(
                400,
                `Couple pass ${pid} requires attendees in pairs (even count).`
              )
            );
          }

          // Count genders (simple mapping: 'male' / 'female' detection)
          let male = 0;
          let female = 0;
          for (const a of attendeesForPass) {
            const g = (a.gender || "").toString().trim().toLowerCase();
            if (g === "male" || g === "m") male++;
            else if (g === "female" || g === "f") female++;
            else {
              logger.warn(
                `Missing or unknown gender for attendee in couple pass ${pid}`
              );
              await t.rollback();
              return next(
                new ApiError(
                  400,
                  `All attendees for couple pass ${pid} must have a 'gender' of male or female to pair them.`
                )
              );
            }
          }

          // require exact pairing (same number of male and female) to form pairs for the entire list
          if (male !== female) {
            logger.warn(
              `Unmatched genders for couple pass ${pid}: male=${male}, female=${female}`
            );
            await t.rollback();
            return next(
              new ApiError(
                400,
                `Attendees for couple pass ${pid} cannot be paired by gender (male=${male}, female=${female}).`
              )
            );
          }

          const pairs = attendeesForPass.length / 2;
          qtyMap.set(pid, pairs); // one unit = one couple
        } else {
          // non-couple pass: each attendee counts as one unit
          qtyMap.set(pid, attendeesForPass.length);
        }
      }

      // 7) Calculate total price same as createGlobalPassOrderForBillingUser
      let calculatedTotal = 0;
      for (const pass of passes) {
        const qty = qtyMap.get(pass.pass_id) || 0;
        const unitPrice = Number.parseFloat(
          pass.final_price ?? pass.total_price ?? 0
        );
        if (Number.isNaN(unitPrice) || unitPrice < 0) {
          logger.warn(`Invalid pass unit price for pass ${pass.pass_id}`);
          await t.rollback();
          return next(new ApiError(500, "Pass pricing invalid"));
        }
        if (qty > 10000) {
          logger.warn(`Unreasonable quantity for pass ${pass.pass_id}`);
          await t.rollback();
          return next(new ApiError(400, "Invalid pass quantity"));
        }
        calculatedTotal += unitPrice * qty;
      }

      if (
        Number(parseFloat(total_amount)).toFixed(2) !==
        Number(calculatedTotal).toFixed(2)
      ) {
        logger.warn(
          `Total amount mismatch: received ${total_amount}, expected ${calculatedTotal}`
        );
        await t.rollback();
        return next(
          new ApiError(
            400,
            "Total amount does not match the sum of pass prices"
          )
        );
      }

      // 8) Create Order
      const order = await Order.create(
        {
          billing_user_id,
          event_id,
          admin_id: event.admin_id,
          total_amount: calculatedTotal,
          sendAllToBilling,
          status: "pending",
        },
        { transaction: t }
      );
      logger.info(
        `Order created successfully with order_id: ${order.order_id}`
      );

      // 9) Ensure EventBillingUsers
      const [eventBillingUser] = await EventBillingUsers.findOrCreate({
        where: { billing_user_id, event_id, order_id: order.order_id },
        defaults: { billing_user_id, event_id, order_id: order.order_id },
        transaction: t,
      });
      if (!eventBillingUser) {
        logger.error("Failed to create EventBillingUser");
        await t.rollback();
        return next(new ApiError(400, "Failed to create event billing user"));
      }

      // 10) Create OrderItems grouped by pass_id using qtyMap (couples -> pairs)
      const orderItemsMap = new Map();
      for (const [pid, qty] of qtyMap.entries()) {
        // qty is number of units (pairs for couple pass)
        if (qty <= 0) continue;
        const pass = passes.find((p) => p.pass_id === pid);
        const unit_price = parseFloat(
          pass.final_price ?? pass.total_price ?? 0
        );
        const total_price = unit_price * qty;

        const orderItem = await OrderItem.create(
          {
            order_id: order.order_id,
            pass_id: pid,
            quantity: qty,
            unit_price,
            total_price,
          },
          { transaction: t }
        );

        orderItemsMap.set(pid, orderItem);
      }

      // 11) Create/Capture attendees, link to SubEventAttendee for remainingIds, and link OrderItemAttendee
      for (const [pid, attendeeList] of passToAttendees.entries()) {
        // orderItem for this pass
        const orderItem = orderItemsMap.get(pid);
        if (!orderItem) {
          // if qty was zero (shouldn't happen), skip
          continue;
        }

        // For couple passes, we must also create OrderItemAttendee entries for both members
        // We will keep linking each attendee individually to the orderItem (so later issuance can find them)
        for (const attendeeData of attendeeList) {
          const normalizedEmail = attendeeData.email
            ? attendeeData.email.toLowerCase().trim()
            : null;
          const normalizedWhatsapp = attendeeData.whatsapp
            ? attendeeData.whatsapp.trim()
            : null;

          let attendee = null;
          if (normalizedWhatsapp) {
            attendee = await Attendee.findOne({
              where: { whatsapp: normalizedWhatsapp },
              transaction: t,
            });
          }
          if (!attendee && normalizedEmail) {
            attendee = await Attendee.findOne({
              where: { email: normalizedEmail },
              transaction: t,
            });
          }
          if (!attendee) {
            attendee = await Attendee.create(
              {
                name: attendeeData.name,
                email: normalizedEmail,
                whatsapp: normalizedWhatsapp,
                gender: attendeeData.gender,
              },
              { transaction: t }
            );
            logger.info(
              `Attendee created: ${normalizedEmail ?? normalizedWhatsapp}`
            );
          }
          // Link order-item -> attendee
          await OrderItemAttendee.findOrCreate({
            where: {
              order_item_id: orderItem.order_item_id,
              attendee_id: attendee.attendee_id,
            },
            defaults: { assigned_date: new Date() },
            transaction: t,
          });

          // create missing SubEventAttendee links for remainingIds (one per subevent)
          const existingLinks = await SubEventAttendee.findAll({
            where: {
              attendee_id: attendee.attendee_id,
              subevent_id: { [Op.in]: remainingIds },
            },
            attributes: ["subevent_id"],
            transaction: t,
          });
          const existingIds = new Set(existingLinks.map((r) => r.subevent_id));
          const toCreate = remainingIds.filter((sid) => !existingIds.has(sid));
          for (const sid of toCreate) {
            await SubEventAttendee.create(
              {
                subevent_id: sid,
                attendee_id: attendee.attendee_id,
                created_at: new Date(),
                updated_at: new Date(),
              },
              { transaction: t }
            );
          }
        } // end attendeeList loop
      } // end passToAttendees loop

      // commit transaction
      logger.info(
        `Global pass order completed successfully for order_id: ${order.order_id}`
      );
      const amountInPaise = Math.round(Number(order.total_amount) * 100); // if order_amount is rupees
      logger.debug(
        `creating transaction for order ${order.order_id}, amount: ${amountInPaise} paise`
      );
      const transaction = await Transaction.create(
        {
          order_id: order.order_id,
          admin_id: order.admin_id,
          amount: Number(order.total_amount).toFixed(2),
          merchant_order_id: null,
          status: "pending",
        },
        { transaction: t }
      );
      logger.info(`Transaction created with id ${transaction.transaction_id}`);
      const phonePeResp = await createPayment({
        amountInPaise,
        redirectUrl:
          process.env.DEFAULT_REDIRECT_URL +
            `?transactionId=${transaction.transaction_id}` ||
          `https://rkgarbanight.com/payment/result?transactionId=${transaction.transaction_id}`,
        merchantOrderId: order.order_id,
        meta: {
          udf1: billingUser.email || "",
          udf2: billingUser.mobile_no || "",
        },
      });
      logger.info(
        `Payment initiated for order ${order.order_id} with response ${phonePeResp.toString()}`
      );
      await transaction.update(
        {
          merchant_order_id: phonePeResp.merchantOrderId || order.order_id,
          merchant_payment_id: phonePeResp.rawResponse.orderId || null,
          redirect_url: phonePeResp.redirectUrl || null,
          gateway_response: phonePeResp.rawResponse || phonePeResp,
        },
        { transaction: t }
      );
      await order.update(
        { merchant_order_id: phonePeResp.merchantOrderId || order.order_id },
        { transaction: t }
      );
      await t.commit();
      return res.status(201).json(
        new ApiResponse(
          201,
          {
            order,
            redirectUrl: phonePeResp.redirectUrl,
            merchantOrderId: phonePeResp.merchantOrderId || order.order_id,
          },
          "Order created successfully"
        )
      );
    } catch (error) {
      await t.rollback();
      logger.error("Failed to create global pass order", {
        stack: error.stack,
      });
      return next(
        new ApiError(500, "Failed to create global pass order", error)
      );
    }
  }
);

const createOrderForBillingUser = asyncHandler(async (req, res, next) => {
  const {
    subevent_id,
    billing_user_id,
    total_amount,
    attendees,
    sendAllToBilling,
  } = req.body;

  logger.debug(
    `createOrderForBillingUser request received for subevent_id: ${subevent_id}, billing_user_id: ${billing_user_id}`
  );

  const t = await sequelize.transaction();

  try {
    const subevent = await SubEvent.findOne({
      where: { subevent_id, is_active: true },
      transaction: t,
    });
    if (!subevent) {
      logger.warn(
        `Subevent not found or inactive for subevent_id: ${subevent_id}`
      );
      await t.rollback();
      return next(new ApiError(404, "Subevent not found or inactive"));
    }

    // available_quantity still counted per attendee (couple pass consumes 2 seats), so existing check remains:
    if (subevent.available_quantity < attendees.length) {
      logger.warn(
        `Not enough quantity for subevent_id: ${subevent_id}. Requested: ${attendees.length}, Available: ${subevent.available_quantity}`
      );
      await t.rollback();
      return next(
        new ApiError(
          400,
          "Not enough available quantity for the selected subevent"
        )
      );
    }
    const billingUser = await BillingUser.findByPk(billing_user_id);
    if (!billingUser) {
      return next(new ApiError(400, "BillingUser not found"));
    }
    // -------------------------
    // Build pass -> attendee list map
    // -------------------------
    const passToAttendees = new Map();
    for (const attendee of attendees) {
      if (!attendee.pass_id) {
        logger.warn("pass_id missing for an attendee");
        await t.rollback();
        return next(new ApiError(400, "pass_id is required for each attendee"));
      }
      const list = passToAttendees.get(attendee.pass_id) || [];
      list.push(attendee);
      passToAttendees.set(attendee.pass_id, list);
    }
    const passIds = Array.from(passToAttendees.keys());
    // 2. Fetch all passes to check prices and availability
    const passes = await Pass.findAll({
      where: {
        pass_id: passIds,
        is_active: true,
      },
      transaction: t,
    });

    const hasGlobalPass = passes.some((pass) => pass.is_global === true);
    if (hasGlobalPass) {
      logger.warn(
        "Order creation failed: One or more passes are global (is_global=true)"
      );
      await t.rollback();
      return next(
        new ApiError(
          400,
          "Order cannot contain global passes. Only non-global passes are allowed."
        )
      );
    }
    if (passes.length !== passToAttendees.size) {
      logger.warn("One or more passes are invalid or inactive");
      await t.rollback();
      return next(
        new ApiError(400, "One or more passes are invalid or inactive")
      );
    }
    const isGroupPass = (pass) =>
      pass.is_group === true ||
      (typeof pass.category === "string" &&
        pass.category.toLowerCase().includes("group"));
    // Identify couple passes
    const isCouplePass = (pass) =>
      pass.is_couple === true ||
      (typeof pass.category === "string" &&
        pass.category.toLowerCase().includes("couple"));

    // 3. Calculate total price with couple pairing (qty = pairs for couple passes)
    let calculatedTotal = 0;
    const qtyMap = new Map(); // pass_id -> quantity (units)
    for (const pass of passes) {
      const pid = pass.pass_id;
      const attendeeList = passToAttendees.get(pid) || [];
      if (!attendeeList.length) {
        qtyMap.set(pid, 0);
        continue;
      }
      if (isGroupPass(pass)) {
        qtyMap.set(pid, 1);
        calculatedTotal += parseFloat(pass.final_price);
        logger.info(
          `Group pass ${pid} applied for ${attendeeList.length} attendees at single price: ${pass.final_price}`
        );
      } else if (isCouplePass(pass)) {
        // couple pass specific validation
        if (attendeeList.length % 2 !== 0) {
          logger.warn(
            `Odd number of attendees (${attendeeList.length}) for couple pass ${pid}`
          );
          await t.rollback();
          return next(
            new ApiError(
              400,
              `Couple pass ${pid} requires attendees in pairs (even count).`
            )
          );
        }

        let male = 0;
        let female = 0;
        for (const a of attendeeList) {
          const g = (a.gender || "").toString().trim().toLowerCase();
          if (g === "male" || g === "m") male++;
          else if (g === "female" || g === "f") female++;
          else {
            logger.warn(
              `Missing or unknown gender for attendee in couple pass ${pid}`
            );
            await t.rollback();
            return next(
              new ApiError(
                400,
                `All attendees for couple pass ${pid} must have a gender of male or female to pair them.`
              )
            );
          }
        }

        if (male !== female) {
          logger.warn(
            `Unmatched genders for couple pass ${pid}: male=${male}, female=${female}`
          );
          await t.rollback();
          return next(
            new ApiError(
              400,
              `Attendees for couple pass ${pid} cannot be paired by gender (male=${male}, female=${female}).`
            )
          );
        }

        const pairs = attendeeList.length / 2;
        qtyMap.set(pid, pairs);
        calculatedTotal += parseFloat(pass.final_price) * pairs;
      } else {
        // standard pass
        const qty = attendeeList.length;
        qtyMap.set(pid, qty);
        if (qty > 10) {
          logger.warn(`Pass quantity exceeds limit of 10 for pass_id: ${pid}`);
          await t.rollback();
          return next(new ApiError(400, "Pass quantity exceeds limit of 10"));
        }
        calculatedTotal += parseFloat(pass.final_price) * qty;
      }
    }

    if (parseFloat(total_amount).toFixed(2) !== calculatedTotal.toFixed(2)) {
      logger.warn(
        `Total amount mismatch: received ${total_amount}, expected ${calculatedTotal}`
      );
      await t.rollback();
      return next(
        new ApiError(400, "Total amount does not match the sum of pass prices")
      );
    }

    // 4. Create Order
    const order = await Order.create(
      {
        billing_user_id,
        subevent_id,
        admin_id: subevent.admin_id,
        total_amount: calculatedTotal,
        sendAllToBilling,
      },
      { transaction: t }
    );
    logger.info(`Order created successfully with order_id: ${order.order_id}`);

    const event_billing_user = await EventBillingUsers.create(
      {
        billing_user_id,
        event_id: subevent.event_id,
        order_id: order.order_id,
      },
      { transaction: t }
    );
    if (!event_billing_user) {
      logger.error("Failed to creat event billing user");
      await t.rollback();
      return next(new ApiError(400, "Failed to create event billing user"));
    }

    // 5. Create OrderItems grouped by pass_id using qtyMap
    const orderItemsMap = new Map();
    for (const [passId, qty] of qtyMap.entries()) {
      if (!qty || qty <= 0) continue;
      const pass = passes.find((p) => p.pass_id === passId);
      const unit_price = parseFloat(pass.final_price);
      const total_price = unit_price * qty;

      const orderItem = await OrderItem.create(
        {
          order_id: order.order_id,
          pass_id: passId,
          quantity: qty,
          unit_price,
          total_price,
        },
        { transaction: t }
      );

      orderItemsMap.set(passId, orderItem);
    }

    // 6. Create Attendees and link to subevent & order items
    for (const attendeeData of attendees) {
      const normalizedEmail = attendeeData.email
        ? attendeeData.email.toLowerCase().trim()
        : null;
      const normalizedWhatsapp = attendeeData.whatsapp
        ? attendeeData.whatsapp.trim()
        : null;

      let attendee = null;
      if (normalizedWhatsapp) {
        attendee = await Attendee.findOne({
          where: { whatsapp: normalizedWhatsapp },
          transaction: t,
        });
      }
      if (!attendee && normalizedEmail) {
        attendee = await Attendee.findOne({
          where: { email: normalizedEmail },
          transaction: t,
        });
      }

      if (!attendee) {
        attendee = await Attendee.create(
          {
            name: attendeeData.name,
            email: normalizedEmail,
            gender: attendeeData.gender,
            whatsapp: normalizedWhatsapp,
          },
          { transaction: t }
        );
        logger.info(`Attendee created: ${normalizedEmail}`);
      }

      await SubEventAttendee.findOrCreate({
        where: {
          subevent_id,
          attendee_id: attendee.attendee_id,
        },
        defaults: {
          created_at: new Date(),
          updated_at: new Date(),
        },
        transaction: t,
      });

      const orderItem = orderItemsMap.get(attendeeData.pass_id);
      if (!orderItem) {
        logger.warn(`Pass ID mismatch for attendee ${normalizedEmail}`);
        await t.rollback();
        return next(
          new ApiError(
            400,
            "Pass ID for attendee does not match any order item"
          )
        );
      }

      await OrderItemAttendee.findOrCreate({
        where: {
          order_item_id: orderItem.order_item_id,
          attendee_id: attendee.attendee_id,
        },
        defaults: {
          assigned_date: new Date(),
        },
        transaction: t,
      });
    }

    subevent.available_quantity -= attendees.length;
    await subevent.save({ transaction: t });

    logger.info(`Order completed successfully for order_id: ${order.order_id}`);
    const amountInPaise = Math.round(Number(order.total_amount) * 100); // if order_amount is rupees
    logger.debug(
      `creating transaction for order ${order.order_id}, amount: ${amountInPaise} paise`
    );
    const transaction = await Transaction.create(
      {
        order_id: order.order_id,
        admin_id: order.admin_id,
        amount: Number(order.total_amount).toFixed(2),
        merchant_order_id: null,
        status: "pending",
      },
      { transaction: t }
    );

    const phonePeResp = await createPayment({
      amountInPaise,
      redirectUrl:
        process.env.DEFAULT_REDIRECT_URL +
          `?transactionId=${transaction.transaction_id}` ||
        `https://rkgarbanight.com/payment/result?transactionId=${transaction.transaction_id}`,
      merchantOrderId: order.order_id,
      meta: {
        udf1: billingUser.email || "",
        udf2: billingUser.mobile_no || "",
      },
    });

    await transaction.update(
      {
        merchant_order_id: phonePeResp.merchantOrderId || order.order_id,
        merchant_payment_id: phonePeResp.rawResponse.orderId || null,
        redirect_url: phonePeResp.redirectUrl || null,
        gateway_response: phonePeResp.rawResponse || phonePeResp,
      },
      { transaction: t }
    );
    await order.update(
      { merchant_order_id: phonePeResp.merchantOrderId || order.order_id },
      { transaction: t }
    );
    await t.commit();

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          order,
          redirectUrl: phonePeResp.redirectUrl,
          merchantOrderId: phonePeResp.merchantOrderId || order.order_id,
        },
        "Order created successfully"
      )
    );
  } catch (error) {
    await t.rollback();
    logger.error("Failed to create order", { stack: error.stack });
    return next(new ApiError(500, "Failed to create order", error));
  }
});

const issuePassToAttendees = asyncHandler(async (req, res, next) => {
  let order;
  try {
    const { order_id } = req.body;

    logger.info(`Issue Pass request received for order_id: ${order_id}`);

    if (!order_id) {
      logger.warn("Order ID is missing in request body");
      return next(new ApiError(400, "Order ID is required"));
    }

    // 1. Fetch order with associated transaction
    order = await Order.findByPk(order_id, {
      include: [{ model: Transaction, as: "transaction" }],
    });

    if (!order) {
      logger.warn(`Order not found for id: ${order_id}`);
      return next(new ApiError(404, `Order not found for id: ${order_id}`));
    }
    if (order.status !== "confirmed") {
      logger.warn(
        `Order is not confirmed yet. Current status: ${order.status}`
      );
      return next(
        new ApiError(
          400,
          `Order is already processed or not in a pending state.`
        )
      );
    }
    const transaction = order.transaction;
    if (!transaction) {
      logger.warn(`Transaction not found for order: ${order_id}`);
      return next(new ApiError(400, "Transaction not found for this order"));
    }

    logger.info(
      `Order ${order_id} found with transaction ${transaction.transaction_id}`
    );

    // 2. Check transaction status
    if (transaction.status !== "success") {
      logger.warn(
        `Transaction status is '${transaction.status}' for order ${order_id}`
      );
      return next(
        new ApiError(
          400,
          `Transaction status is '${transaction.status}'. Passes can only be issued for successful transactions.`
        )
      );
    }

    const orderTotal = parseFloat(order.total_amount).toFixed(2);
    const transactionAmount = parseFloat(transaction.amount).toFixed(2);
    if (orderTotal !== transactionAmount) {
      logger.warn(
        `Transaction amount mismatch for order ${order_id}: orderTotal=${orderTotal}, transactionAmount=${transactionAmount}`
      );
      return next(
        new ApiError(
          400,
          `Transaction amount (${transactionAmount}) does not match order total (${orderTotal}).`
        )
      );
    }
    const billingUser = await BillingUser.findByPk(order.billing_user_id);
    if (!billingUser) {
      return next(
        new ApiError(400, "Billing User not found for this order_id")
      );
    }
    // 4. Fetch order items with pass
    const orderItems = await OrderItem.findAll({
      where: { order_id },
      include: [{ model: Pass, as: "pass" }],
    });

    if (!orderItems.length) {
      logger.warn(`No order items found for order ${order_id}`);
      return next(new ApiError(400, "No order items found for this order"));
    }

    const hasGlobalPass = orderItems.some(
      (item) => item.pass && item.pass.is_global === true
    );
    if (hasGlobalPass) {
      logger.warn(`Order ${order_id} contains a global pass`);
      return next(
        new ApiError(
          400,
          "Order contains a global pass (is_global=true); cannot issue passes for such orders."
        )
      );
    }
    logger.info(`Found ${orderItems.length} order items for order ${order_id}`);
    // container for all issued passes for this order (used when sendAllToBilling === true)
    const issuedPassesForBilling = [];

    // Process all order items
    await Promise.all(
      orderItems.map(async (item) => {
        const order_item_id = item.order_item_id;
        const pass_id = item.pass_id;

        if (!item.pass) {
          logger.error(`Pass not found for order item ${order_item_id}`);
          throw new ApiError(
            400,
            `Pass not found for order item ${order_item_id}`
          );
        }

        const passSubEvents = await PassSubEvent.findAll({
          where: { pass_id },
          attributes: ["subevent_id"],
        });

        if (!passSubEvents.length) {
          logger.warn(`No subevents linked with pass ${pass_id}`);
          throw new ApiError(400, `No subevents linked with pass ${pass_id}`);
        }

        const subeventIds = passSubEvents.map((pse) => pse.subevent_id);
        const subevents = await SubEvent.findAll({
          where: { subevent_id: subeventIds },
          attributes: ["subevent_id", "date", "name"],
        });

        if (!subevents.length) {
          logger.warn(`SubEvents not found for pass ${pass_id}`);
          throw new ApiError(400, `SubEvents not found for pass ${pass_id}`);
        }

        const mainSubEvent = subevents[0];
        const subeventDate = getDateIST(mainSubEvent.date);
        const expiryDate = new Date(
          subeventDate.getFullYear(),
          subeventDate.getMonth(),
          subeventDate.getDate(),
          23,
          59,
          59,
          999
        );

        const orderItemAttendees = await OrderItemAttendee.findAll({
          where: { order_item_id },
          include: [{ model: Attendee, as: "attendee" }],
        });

        if (!orderItemAttendees.length) {
          logger.warn(`No attendees found for order item ${order_item_id}`);
          throw new ApiError(
            400,
            `No attendees found for order item ${order_item_id}`
          );
        }

        logger.info(
          `Issuing passes for ${orderItemAttendees.length} attendees for order item ${order_item_id}`
        );

        // process each attendee
        await Promise.all(
          orderItemAttendees.map(async (oia) => {
            const attendee = oia.attendee;
            if (!attendee) return;

            const checkPassExist = await IssuedPass.findOne({
              where: {
                pass_id,
                attendee_id: attendee.attendee_id,
                order_item_id,
              },
            });

            if (checkPassExist) {
              logger.warn(
                `Pass already issued for attendee ${attendee.attendee_id}, order item ${order_item_id}`
              );
              throw new ApiError(
                400,
                `Pass is already issued for attendee ${attendee.attendee_id}`
              );
            }

            const issuedPass = await IssuedPass.create({
              pass_id,
              attendee_id: attendee.attendee_id,
              subevent_id: mainSubEvent.subevent_id,
              admin_id: attendee.admin_id ?? order.admin_id,
              transaction_id: transaction.transaction_id,
              order_item_id,
              is_expired: false,
              issued_date: new Date(),
              expiry_date: expiryDate,
              status: "active",
              used_count: 0,
              qr_data: null,
              qr_image: null,
              sponsored_pass: false,
            });

            logger.info(
              `Issued pass ${issuedPass.issued_pass_id} for attendee ${attendee.attendee_id}`
            );

            const qrData = await generateQR({
              orderItemId: order_item_id,
              orderId: order_id,
              issuePass_Id: issuedPass.issued_pass_id,
            });

            if (!qrData || !qrData.success || !qrData.image || !qrData.data) {
              logger.error(
                `Failed to generate QR for issued pass ${issuedPass.issued_pass_id}`,
                qrData?.error
              );
              throw new ApiError(
                500,
                "Failed to generate QR code",
                qrData?.error
              );
            }

            await issuedPass.update({
              qr_data: qrData.data,
              qr_image: qrData.image,
            });
            // accumulate issued-pass info for billing email if needed
            issuedPassesForBilling.push({
              issued_pass_id: issuedPass.issued_pass_id,
              order_item_id,
              pass_id,
              attendee_id: attendee.attendee_id,
              attendee_name: attendee.name,
              attendee_email: attendee.email,
              qrImage: qrData.image,
              passCategory: item.pass?.category ?? null,
              subeventName: mainSubEvent.name,
              expiryDate: formatExpiryForEmail(issuedPass.expiry_date),
            });

            const cid = `qr-${issuedPass.issued_pass_id}@example.com`;
            let attachments = [];
            try {
              const att = dataUrlToAttachment(
                qrData.image,
                `qr-${issuedPass.issued_pass_id}.png`,
                cid
              );
              attachments.push(att);
            } catch (e) {
              logger.warn(
                "Failed to convert QR data URL to attachment, will still try inline image url",
                e
              );
            }
            // send single emails to attendees only when sendAllToBilling is falsy
            if (Boolean(order.sendAllToBilling) === false) {
              // send mail to attendee
              const { emailData, error } = await sendMail(
                attendee.email,
                "issuedPass",
                {
                  attendee,
                  qrImage: qrData.image,
                  qrCid: cid,
                  passCategory: item.pass.category,
                  orderNumber: order_id,
                  subeventName: mainSubEvent.name,
                  expiryDate: formatExpiryForEmail(issuedPass.expiry_date),
                },
                attachments
              );
              if (error !== null) {
                logger.error(
                  `Error sending email for issued pass ${issuedPass.issued_pass_id} to attendee ${attendee.attendee_id}`,
                  error
                );
                return next(
                  new ApiError(
                    500,
                    "Failed to send email contact admin for the passes",
                    error
                  )
                );
              }

              const isSuccess =
                emailData &&
                Array.isArray(emailData.accepted) &&
                emailData.accepted.length > 0 &&
                emailData.rejected.length === 0 &&
                emailData.response &&
                emailData.response.startsWith("250");

              if (!isSuccess) {
                logger.error(
                  `Email sending failed for issued pass ${issuedPass.issued_pass_id} to attendee ${attendee.attendee_id}`,
                  emailData
                );
                return next(
                  new ApiError(
                    500,
                    "Failed to send email contact admin for the passes",
                    emailData
                  )
                );
              }
              logger.info(
                `Email sent for issued pass ${issuedPass.issued_pass_id} to attendee ${attendee.attendee_id}`
              );
            }
          })
        ); // end orderItemAttendees.map
      })
    ); // end orderItems.map

    // If sendAllToBilling is truthy, send ONE email to billing user with all passes
    if (Boolean(order.sendAllToBilling) === true) {
      // figure out billing email - try a few fallbacks
      const attachments = [];
      const passesForTemplate = issuedPassesForBilling.map((p) => {
        const cid = `qr-${p.issued_pass_id}@${order_id}`;
        if (p.qrImage) {
          try {
            const att = dataUrlToAttachment(
              p.qrImage,
              `qr-${p.issued_pass_id}.png`,
              cid
            );
            attachments.push(att);
          } catch (e) {
            logger.warn(
              `Failed to convert qrImage to attachment for issued_pass ${p.issued_pass_id}`,
              e
            );
            // still continue — template will render placeholder if needed
          }
        }
        return {
          attendee_name: p.attendee_name,
          attendee_email: p.attendee_email,
          passCategory: p.passCategory,
          subeventName: p.subeventName,
          expiryDate: p.expiryDate,
          issued_pass_id: p.issued_pass_id,
          qrCid: cid, // used in template as <img src="cid:..."/>
        };
      });
      let billingEmail = billingUser.email;
      if (!billingEmail) {
        logger.error(
          `Billing email not found for order ${order_id} but sendAllToBilling is true`
        );
        return next(
          new ApiError(
            500,
            "Billing email not found to send consolidated passes"
          )
        );
      }

      const billingUserName = billingUser.name || "Valued Customer";
      // send consolidated email to billing email
      const { emailData, error } = await sendMail(
        billingEmail,
        "issuedPassBulk",
        {
          orderId: order_id,
          billingUserName,
          passes: passesForTemplate,
        },
        attachments
      );
      if (error !== null) {
        logger.error(
          `Failed to send consolidated email to billing ${billingEmail}`,
          error
        );
        return next(
          new ApiError(500, "Failed to send consolidated passes email", error)
        );
      }
      const isSuccess =
        emailData &&
        Array.isArray(emailData.accepted) &&
        emailData.accepted.length > 0 &&
        Array.isArray(emailData.rejected) &&
        emailData.rejected.length === 0;

      if (!isSuccess) {
        logger.error(
          `Consolidated email reported issues for order ${order_id}`,
          emailData
        );
        return next(
          new ApiError(
            500,
            "Failed to deliver consolidated passes email",
            emailData
          )
        );
      }

      logger.info(
        `Consolidated email with ${issuedPassesForBilling.length} passes sent to billing email ${billingEmail}`
      );
    }

    logger.info(`All passes issued successfully for order ${order_id}`);
    await order.update({ status: "expired" });
    return res
      .status(200)
      .json(
        new ApiResponse(200, {}, "Passes issued and emails sent successfully")
      );
  } catch (error) {
    logger.error("Error in issuePassToAttendees", error);
    if (order && order.status === "pending") {
      try {
        await order.update({ status: "failed" });
      } catch (updateError) {
        logger.error("Failed to update order to failed status", updateError);
      }
    }
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const issueGlobalPassToAttendees = asyncHandler(async (req, res, next) => {
  let order;
  const sequelize = Order.sequelize;
  try {
    const { order_id } = req.body;

    logger.info(`Global pass issuance requested for order_id: ${order_id}`);

    if (!order_id) {
      logger.warn("Order ID missing in request");
      return next(new ApiError(400, "Order ID is required"));
    }

    // 1. Fetch order with transaction
    order = await Order.findByPk(order_id, {
      include: [{ model: Transaction, as: "transaction" }],
    });

    if (!order) {
      logger.warn(`Order not found for id: ${order_id}`);
      return next(new ApiError(404, `Order not found for id: ${order_id}`));
    }

    if (order.status !== "confirmed") {
      logger.warn(
        `Order is not being confirmed yet. Current status: ${order.status}`
      );
      return next(
        new ApiError(
          400,
          `Order is already processed or not in a pending state.`
        )
      );
    }
    const transaction = order.transaction;
    if (!transaction) {
      logger.warn(`Transaction not found for order ${order_id}`);
      return next(new ApiError(400, "Transaction not found for this order"));
    }

    // 2. Validate transaction status & amount
    if (transaction.status !== "success") {
      logger.warn(
        `Transaction status '${transaction.status}' invalid for order ${order_id}`
      );
      return next(
        new ApiError(
          400,
          `Transaction status is '${transaction.status}'. Cannot issue passes.`
        )
      );
    }

    const orderTotal = parseFloat(order.total_amount).toFixed(2);
    const transactionAmount = parseFloat(transaction.amount).toFixed(2);
    if (orderTotal !== transactionAmount) {
      logger.warn(
        `Transaction amount mismatch for order ${order_id}: orderTotal=${orderTotal}, transactionAmount=${transactionAmount}`
      );
      return next(
        new ApiError(
          400,
          `Transaction amount (${transactionAmount}) does not match order total (${orderTotal}).`
        )
      );
    }

    // fetch billing user (name used in templates)
    const billingUser = await BillingUser.findByPk(order.billing_user_id);
    if (!billingUser) {
      return next(
        new ApiError(400, "Billing User not found for this order_id")
      );
    }
    const billingUserName = billingUser.name || "Valued Customer";

    // 3. Validate order items count (should be exactly 1 global pass item)
    const orderItems = await OrderItem.findAll({
      where: { order_id },
      include: [{ model: Pass, as: "pass" }],
    });

    if (!orderItems.length) {
      logger.warn(`No order items found for order ${order_id}`);
      return next(new ApiError(400, "No order items found for this order"));
    }

    const issuedPassesForBilling = [];
    for (const item of orderItems) {
      if (!item.pass || !item.pass.is_global) {
        logger.warn(`Order item ${item.order_item_id} is not a global pass`);
        return next(
          new ApiError(
            400,
            "The order item does not correspond to a global pass"
          )
        );
      }
      const passId = item.pass.pass_id;

      // 4. Fetch PassSubEvent rows for this pass (bulk)
      const passSubEvents = await PassSubEvent.findAll({
        where: { pass_id: passId },
        attributes: ["subevent_id"],
        raw: true,
      });

      if (!passSubEvents.length) {
        logger.warn(`No subevents linked with global pass ${passId}`);
        return next(
          new ApiError(400, `No subevents linked with global pass ${passId}`)
        );
      }

      const subeventIds = Array.from(
        new Set(passSubEvents.map((r) => r.subevent_id))
      );

      // 5. Fetch subevents (ordered by day if you have 'day' on the model)
      const subevents = await SubEvent.findAll({
        where: { subevent_id: subeventIds },
        attributes: ["subevent_id", "date", "name", "day"],
        order: [["day", "ASC"]],
        raw: true,
      });

      if (!subevents.length) {
        logger.warn(`Subevents not found for global pass ${passId}`);
        return next(
          new ApiError(400, "Subevent linked to global pass not found")
        );
      }

      // 6. Fetch attendees linked to the order item
      const orderItemAttendees = await OrderItemAttendee.findAll({
        where: { order_item_id: item.order_item_id },
        include: [{ model: Attendee, as: "attendee" }],
      });

      if (!orderItemAttendees.length) {
        logger.warn(`No attendees found for order item ${item.order_item_id}`);
        return next(
          new ApiError(400, "No attendees found for the global pass order item")
        );
      }

      logger.info(
        `Issuing global passes for ${orderItemAttendees.length} attendees`
      );

      // 7. Prefetch existing issued passes for these subevents to avoid duplicates
      const existingIssuedPasses = await IssuedPass.findAll({
        where: {
          pass_id: passId,
          order_item_id: item.order_item_id,
          subevent_id: { [Op.in]: subeventIds },
        },
        attributes: ["issued_pass_id", "attendee_id", "subevent_id"],
        raw: true,
      });

      const existingKeys = new Set(
        existingIssuedPasses.map((p) => `${p.attendee_id}|${p.subevent_id}`)
      );

      // container for consolidated billing email if required

      // 8. Create issued passes inside a transaction
      await sequelize.transaction(async (tx) => {
        for (const oia of orderItemAttendees) {
          const attendee = oia.attendee;
          if (!attendee) continue;

          const issuedDetailsForAttendee = [];

          for (let i = 0; i < subevents.length; i++) {
            const subevent = subevents[i];
            const key = `${attendee.attendee_id}|${subevent.subevent_id}`;

            if (existingKeys.has(key)) {
              logger.warn(
                `Pass already issued for attendee ${attendee.attendee_id} for subevent ${subevent.subevent_id}`
              );
              // preserve existing behaviour: error out
              throw new ApiError(400, "Pass is already issued");
            }

            const subeventDate = getDateIST(subevent.date);
            const expiryDate = new Date(
              subeventDate.getFullYear(),
              subeventDate.getMonth(),
              subeventDate.getDate(),
              23,
              59,
              59,
              999
            );

            // create issued pass
            const issuedPass = await IssuedPass.create(
              {
                pass_id: passId,
                attendee_id: attendee.attendee_id,
                subevent_id: subevent.subevent_id,
                admin_id: attendee.admin_id ?? order.admin_id,
                transaction_id: transaction.transaction_id,
                order_item_id: item.order_item_id,
                is_expired: false,
                issued_date: new Date(),
                expiry_date: expiryDate,
                status: "active",
                used_count: 0,
                qr_data: null,
                qr_image: null,
                sponsored_pass: false,
              },
              { transaction: tx }
            );

            logger.info(
              `Issued global pass ${issuedPass.issued_pass_id} for attendee ${attendee.attendee_id}, subevent ${subevent.subevent_id}`
            );

            // generate QR (we keep generation as in other functions)
            const qrData = await generateQR({
              orderItemId: item.order_item_id,
              orderId: order_id,
              subeventId: subevent.subevent_id,
              issuePass_Id: issuedPass.issued_pass_id,
            });

            if (!qrData || !qrData.success || !qrData.image || !qrData.data) {
              logger.error(
                `Failed to generate QR for issued pass ${issuedPass.issued_pass_id}`,
                qrData?.error
              );
              throw new ApiError(
                500,
                "Failed to generate QR code",
                qrData?.error
              );
            }

            // update issued pass with QR info inside transaction
            await issuedPass.update(
              { qr_data: qrData.data, qr_image: qrData.image },
              { transaction: tx }
            );

            // accumulate for per-attendee and billing templates
            const rec = {
              issued_pass_id: issuedPass.issued_pass_id,
              attendee_id: attendee.attendee_id,
              attendee_name: attendee.name,
              attendee_email: attendee.email,
              subeventName: subevent.name,
              expiryDate,
              qrImage: qrData.image,
              day: subevent.day ?? i + 1,
            };
            issuedDetailsForAttendee.push(rec);
            issuedPassesForBilling.push(rec);

            // mark as existing
            existingKeys.add(key);
          } // end subevents loop

          // send per-attendee multi-day email if sendAllToBilling is falsy
          if (Boolean(order.sendAllToBilling) === false) {
            // prepare attachments and template data
            const attachments = [];
            const passesForMail = issuedDetailsForAttendee.map((d) => {
              if (d.qrImage) {
                try {
                  const cid = `qr-${d.issued_pass_id}@${order_id}`;
                  const att = dataUrlToAttachment(
                    d.qrImage,
                    `qr-${d.issued_pass_id}.png`,
                    cid
                  );
                  attachments.push(att);
                } catch (e) {
                  logger.warn(
                    `Failed to convert QR for issued_pass ${d.issued_pass_id} to attachment: ${e}`
                  );
                }
              }
              return {
                subeventName: d.subeventName,
                expiryDate: formatExpiryForEmail(d.expiryDate),
                qrCid: `qr-${d.issued_pass_id}@${order_id}`,
                day: d.day,
                issued_pass_id: d.issued_pass_id,
              };
            });

            // === UPDATED: include billingUserName in payload ===
            const { emailData, error } = await sendMail(
              attendee.email,
              "issuedPassMultiDay",
              {
                attendee,
                passes: passesForMail,
                passCategory: item.pass.category,
                orderNumber: order_id,
                billingUserName,
              },
              attachments
            );

            if (error !== null) {
              logger.error(
                `Error sending multi-day email for attendee ${attendee.attendee_id}`,
                error
              );
              throw new ApiError(
                500,
                "Failed to send email to attendee",
                error
              );
            }

            const isSuccess =
              emailData &&
              Array.isArray(emailData.accepted) &&
              emailData.accepted.length > 0 &&
              emailData.rejected.length === 0 &&
              emailData.response &&
              typeof emailData.response === "string" &&
              emailData.response.startsWith("250");

            if (!isSuccess) {
              logger.error(
                `Email sending failed for attendee ${attendee.attendee_id}`,
                emailData
              );
              throw new ApiError(
                500,
                "Failed to send email contact admin for the passes",
                emailData
              );
            }

            logger.info(`Email sent to attendee ${attendee.attendee_id}`);
          }
        } // end attendees loop
      }); // end transaction

      // consolidated billing email unchanged (already includes billingUserName)
    }
    if (Boolean(order.sendAllToBilling) === true) {
      const attachments = [];
      const passesForTemplate = issuedPassesForBilling.map((p) => {
        const cid = `qr-${p.issued_pass_id}@${order_id}`;
        if (p.qrImage) {
          try {
            const att = dataUrlToAttachment(
              p.qrImage,
              `qr-${p.issued_pass_id}.png`,
              cid
            );
            attachments.push(att);
          } catch (e) {
            logger.warn(
              `Failed to convert qrImage to attachment for issued_pass ${p.issued_pass_id}`,
              e
            );
          }
        }
        return {
          attendee_name: p.attendee_name,
          attendee_email: p.attendee_email,
          subeventName: p.subeventName,
          expiryDate: formatExpiryForEmail(p.expiryDate),
          issued_pass_id: p.issued_pass_id,
          passCategory: p.passCategory,
          qrCid: cid,
          day: p.day,
        };
      });

      let billingEmail = billingUser.email;
      if (!billingEmail) {
        logger.error(
          `Billing email not found for order ${order_id} but sendAllToBilling is true`
        );
        return next(
          new ApiError(
            500,
            "Billing email not found to send consolidated passes"
          )
        );
      }

      const billingUserNameFinal = billingUser.name || "Valued Customer";
      const { emailData, error } = await sendMail(
        billingEmail,
        "issuedPassBulk",
        {
          orderId: order_id,
          billingUserName: billingUserNameFinal,
          passes: passesForTemplate,
        },
        attachments
      );

      if (error !== null) {
        logger.error(
          `Failed to send consolidated email to billing ${billingEmail}`,
          error
        );
        return next(
          new ApiError(500, "Failed to send consolidated passes email", error)
        );
      }

      const isSuccess =
        emailData &&
        Array.isArray(emailData.accepted) &&
        emailData.accepted.length > 0 &&
        Array.isArray(emailData.rejected) &&
        emailData.rejected.length === 0;

      if (!isSuccess) {
        logger.error(
          `Consolidated email reported issues for order ${order_id}`,
          emailData
        );
        return next(
          new ApiError(
            500,
            "Failed to deliver consolidated passes email",
            emailData
          )
        );
      }

      logger.info(
        `Consolidated email with ${issuedPassesForBilling.length} passes sent to billing email ${billingEmail}`
      );
    }
    // All good — update order status to confirmed
    logger.info(`All global passes issued successfully for order ${order_id}`);
    await order.update({ status: "expired" });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          "Global passes issued and emails sent successfully"
        )
      );
  } catch (error) {
    logger.error("Error in issueGlobalPassToAttendees", error);
    if (order && order.status === "pending") {
      try {
        await order.update({ status: "failed" });
      } catch (updateError) {
        logger.error("Failed to update order to failed status", updateError);
      }
    }
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

export {
  createBillingUser,
  createOrderForBillingUser,
  issuePassToAttendees,
  issueGlobalPassToAttendees,
  createGlobalPassOrderForBillingUser,
};
