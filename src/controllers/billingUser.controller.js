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
  formatExpiryForEmail,
  getDateIST,
} from "../services/dateconversion.service.js";

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
      pass_id,
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

      // 2. Validate global pass existence and active status
      const pass = await Pass.findOne({
        where: { pass_id, is_active: true, is_global: true },
        transaction: t,
      });
      if (!pass) {
        logger.warn(`Invalid or inactive global pass for pass_id: ${pass_id}`);
        await t.rollback();
        return next(
          new ApiError(400, "Invalid or inactive global pass for this event")
        );
      }

      // 3. Compute remaining subevents (date >= today) for the event
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
        logger.warn(`No more than 1 or no subevents for event ${event_id}`);
        await t.rollback();
        return next(
          new ApiError(400, "No more than 1 or no subevents for event ")
        );
      }

      // 4. Ensure the pass actually covers ALL remaining subevents (true global for remaining days)
      const coveredCount = await PassSubEvent.count({
        where: {
          pass_id,
          subevent_id: { [Op.in]: remainingIds },
        },
        transaction: t,
      });

      if (coveredCount < remainingIds.length) {
        logger.warn(
          `Pass ${pass_id} does not cover all remaining subevents for event ${event_id} (covers ${coveredCount}/${remainingIds.length})`
        );
        await t.rollback();
        return next(
          new ApiError(
            400,
            `Selected pass is not valid for all remaining subevents of this event`
          )
        );
      }

      // 5. Validate total amount: use pass.final_price or pass.total_price depending on your model
      const passUnitPrice = Number.parseFloat(
        pass.final_price ?? pass.total_price ?? 0
      );
      if (Number.isNaN(passUnitPrice) || passUnitPrice < 0) {
        logger.warn(`Invalid pass unit price for pass ${pass_id}`);
        await t.rollback();
        return next(new ApiError(500, "Pass pricing invalid"));
      }
      const calculatedTotal = passUnitPrice * attendees.length;

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

      // 4. Create Order
      const order = await Order.create(
        {
          billing_user_id,
          event_id,
          admin_id: event.admin_id,
          total_amount: calculatedTotal,
          sendAllToBilling,
        },
        { transaction: t }
      );
      logger.info(
        `Order created successfully with order_id: ${order.order_id}`
      );

      const EventBillingUser = await EventBillingUsers.create(
        {
          billing_user_id,
          event_id,
          order_id: order.order_id,
        },
        { transaction: t }
      );
      if (!EventBillingUser) {
        logger.error(`Failed to create Event BillingUser`);
        await t.rollback();
        return next(new ApiError(400, "Failed to Create EventBillingUser"));
      }
      // 5. Create single OrderItem for the global pass
      const orderItem = await OrderItem.create(
        {
          order_id: order.order_id,
          pass_id,
          quantity: attendees.length,
          unit_price: parseFloat(pass.final_price),
          total_price: calculatedTotal,
        },
        { transaction: t }
      );

      const attendeeObjects = [];

      for (const attendeeData of attendees) {
        const normalizedEmail = attendeeData.email
          ? attendeeData.email.toLowerCase().trim()
          : null;
        const normalizedWhatsapp = attendeeData.whatsapp
          ? attendeeData.whatsapp.trim()
          : null;

        // Try to find by email first, otherwise by whatsapp
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

        // Count how many of the remaining subevents this attendee already linked to
        const linkedRemainingCount = await SubEventAttendee.count({
          where: {
            attendee_id: attendee.attendee_id,
            subevent_id: { [Op.in]: remainingIds },
          },
          transaction: t,
        });

        // If attendee already linked to all remaining subevents -> already has global pass for remaining
        if (linkedRemainingCount === remainingIds.length) {
          logger.warn(
            `Attendee ${normalizedEmail} already has a global pass for remaining subevents of event ${event_id}`
          );
          await t.rollback();
          return next(
            new ApiError(
              400,
              `Attendee with email ${normalizedEmail} already assigned a global pass for the remaining subevents of this event`
            )
          );
        }

        // Link order-item -> attendee
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

        attendeeObjects.push(attendee.get({ plain: true }));
      } // end attendees loop

      // All DB operations done — commit
      await t.commit();
      logger.info(
        `Global pass order completed successfully for order_id: ${order.order_id}`
      );
      return res
        .status(201)
        .json(
          new ApiResponse(
            201,
            { order },
            "Global pass order created successfully"
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

    // 1. Aggregate passes and verify quantities and pricing
    const passQtyMap = new Map();
    for (const attendee of attendees) {
      if (!attendee.pass_id) {
        logger.warn("pass_id missing for an attendee");
        await t.rollback();
        return next(new ApiError(400, "pass_id is required for each attendee"));
      }
      passQtyMap.set(
        attendee.pass_id,
        (passQtyMap.get(attendee.pass_id) || 0) + 1
      );
    }

    // 2. Fetch all passes to check prices and availability
    const passes = await Pass.findAll({
      where: {
        pass_id: Array.from(passQtyMap.keys()),
        is_active: true,
      },
      transaction: t,
    });

    if (passes.length !== passQtyMap.size) {
      logger.warn("One or more passes are invalid or inactive");
      await t.rollback();
      return next(
        new ApiError(400, "One or more passes are invalid or inactive")
      );
    }

    // 3. Calculate total price
    let calculatedTotal = 0;
    for (const pass of passes) {
      const qty = passQtyMap.get(pass.pass_id);
      if (qty > 10) {
        logger.warn(
          `Pass quantity exceeds limit of 10 for pass_id: ${pass.pass_id}`
        );
        await t.rollback();
        return next(new ApiError(400, "Pass quantity exceeds limit of 10"));
      }
      calculatedTotal += parseFloat(pass.final_price) * qty;
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
      return next(new ApiError(400, "Failed to create event billing user"));
    }
    // 5. Create OrderItems grouped by pass_id
    const orderItemsMap = new Map();
    for (const [passId, qty] of passQtyMap.entries()) {
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

    await t.commit();
    logger.info(`Order completed successfully for order_id: ${order.order_id}`);

    return res
      .status(201)
      .json(new ApiResponse(201, { order }, "Order created successfully"));
  } catch (error) {
    await t.rollback();
    logger.error("Failed to create order", { stack: error.stack });
    return next(new ApiError(500, "Failed to create order", error));
  }
});

// check the issue-- multiple time pass issued  and booking number
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
    if (order.status !== "pending") {
      logger.warn(
        `Order has already been processed or is not pending. Current status: ${order.status}`
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
    await order.update({ status: "confirmed" });
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
  try {
    const { order_id } = req.body;

    logger.info(`Global pass issuance requested for order_id: ${order_id}`);

    if (!order_id) {
      logger.warn("Order ID missing in request");
      return next(new ApiError(400, "Order ID is required"));
    }

    // 1. Fetch order with transaction
    const order = await Order.findByPk(order_id, {
      include: [{ model: Transaction, as: "transaction" }],
    });

    if (!order) {
      logger.warn(`Order not found for id: ${order_id}`);
      return next(new ApiError(404, `Order not found for id: ${order_id}`));
    }

    const transaction = order.transaction;
    if (!transaction) {
      logger.warn(`Transaction not found for order ${order_id}`);
      return next(new ApiError(400, "Transaction not found for this order"));
    }

    // 2. Validate transaction status
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

    // 3. Validate order items count (should be exactly 1)
    const orderItems = await OrderItem.findAll({
      where: { order_id },
      include: [{ model: Pass, as: "pass" }],
    });

    if (orderItems.length !== 1) {
      logger.warn(
        `Global pass order must have exactly one order item. Found ${orderItems.length}`
      );
      return next(
        new ApiError(400, "Global pass order must have exactly one order item")
      );
    }

    const item = orderItems[0];

    if (!item.pass || !item.pass.is_global) {
      logger.warn(`Order item ${item.order_item_id} is not a global pass`);
      return next(
        new ApiError(400, "The order item does not correspond to a global pass")
      );
    }

    const passSubEvents = await PassSubEvent.findAll({
      where: { pass_id: item.pass.pass_id },
    });

    if (!passSubEvents.length) {
      logger.warn(`No subevents linked with global pass ${item.pass.pass_id}`);
      return next(
        new ApiError(
          400,
          `No subevents linked with global pass ${item.pass.pass_id}`
        )
      );
    }

    const subeventIds = passSubEvents.map((pse) => pse.subevent_id);
    const subevents = await SubEvent.findAll({
      where: { subevent_id: subeventIds },
      attributes: ["subevent_id", "date", "name", "day"],
      order: [["day", "ASC"]],
    });

    if (!subevents.length) {
      logger.warn(`Subevents not found for global pass ${item.pass.pass_id}`);
      return next(
        new ApiError(400, "Subevent linked to global pass not found")
      );
    }
    const billingUser = await BillingUser.findByPk(order.billing_user_id);
    if (!billingUser) {
      return next(
        new ApiError(400, "Billing User not found for this order_id")
      );
    }
    // 4. Fetch attendees linked to the order item
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

    // 5. Issue passes & send emails
    await Promise.all(
      orderItemAttendees.map(async (oia) => {
        const attendee = oia.attendee;
        if (!attendee) return;

        const issuedPassDetails = await Promise.all(
          subevents.map(async (subevent) => {
            const subeventDate = new Date(subevent.date);
            const expiryDate = new Date(
              subeventDate.getFullYear(),
              subeventDate.getMonth(),
              subeventDate.getDate(),
              23,
              59,
              59,
              999
            );

            const existingPass = await IssuedPass.findOne({
              where: {
                pass_id: item.pass.pass_id,
                attendee_id: attendee.attendee_id,
                subevent_id: subevent.subevent_id,
                order_item_id: item.order_item_id,
              },
            });

            if (existingPass) {
              logger.warn(
                `Pass already issued for attendee ${attendee.attendee_id} for subevent ${subevent.subevent_id}`
              );
              return next(new ApiError(400, `Pass is already issued`));
            }

            const issuedPass = await IssuedPass.create({
              pass_id: item.pass.pass_id,
              attendee_id: attendee.attendee_id,
              subevent_id: subevent.subevent_id,
              admin_id: order.admin_id,
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
            });

            logger.info(
              `Issued pass ${issuedPass.issued_pass_id} for attendee ${attendee.attendee_id}, subevent ${subevent.subevent_id}`
            );

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
              return next(
                new ApiError(500, "Failed to generate QR code", qrData?.error)
              );
            }

            await issuedPass.update({
              qr_data: qrData.data,
              qr_image: qrData.image,
            });

            return {
              subeventName: subevent.name,
              expiryDate,
              qrImage: qrData?.image,
            };
          })
        );

        await sendMail(attendee.email, "issuedPassMultiDay", {
          attendee,
          passes: issuedPassDetails.map((pass, i) => ({
            ...pass,
            day: subevents[i]?.day || i + 1,
          })),
          passCategory: item.pass.category,
          orderNumber: order_id,
        });

        logger.info(`Email sent to attendee ${attendee.attendee_id}`);
      })
    );

    logger.info(`All global passes issued successfully for order ${order_id}`);

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
