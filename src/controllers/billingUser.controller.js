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
} from "../db/models/index.js";

import sendMail from "../utils/sendMail.js";

const createBillingUser = asyncHandler(async (req, res, next) => {
  try {
    const { name, mobile_no, whatsapp, email, address, dob, gender, event_id } =
      req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedMobile = String(mobile_no).trim();
    const event = await Event.findByPk(event_id);
    if (!event) {
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
    }
    if (!billingUser) {
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
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const createGlobalPassOrderForBillingUser = asyncHandler(
  async (req, res, next) => {
    const { event_id, billing_user_id, total_amount, attendees, pass_id } =
      req.body;

    const t = await sequelize.transaction();

    try {
      // 1. Validate event existence and status
      const event = await Event.findOne({
        where: { event_id, is_active: true },
        transaction: t,
      });
      if (!event) {
        await t.rollback();
        return next(new ApiError(404, "Event not found or inactive"));
      }

      // 2. Validate global pass existence and active status
      // Option 1: Use the pass_id provided in body (recommended)
      const pass = await Pass.findOne({
        where: { pass_id, is_active: true, is_global: true, event_id },
        transaction: t,
      });
      if (!pass) {
        await t.rollback();
        return next(
          new ApiError(400, "Invalid or inactive global pass for this event")
        );
      }

      // Calculate total price for global pass * attendees count
      const calculatedTotal = parseFloat(pass.final_price) * attendees.length;
      if (parseFloat(total_amount).toFixed(2) !== calculatedTotal.toFixed(2)) {
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
        },
        { transaction: t }
      );

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

      // 6. For each attendee:
      // - Check if an issued pass already exists (via issuedpass model by attendee_id and pass_id)
      // - Create attendee if not exists (by unique keys)
      // - Create OrderItemAttendee link
      // - Issue pass if not already issued
      const eventSubevents = await SubEvent.findAll({
        where: { event_id },
        attributes: ["subevent_id"],
        transaction: t,
      });
      const totalSubeventCount = eventSubevents.length;
      const eventSubeventIds = eventSubevents.map((s) => s.subevent_id);
      for (const attendeeData of attendees) {
        // Normalize email and whatsapp
        const normalizedEmail = attendeeData.email.toLowerCase().trim();
        const normalizedWhatsapp = attendeeData.whatsapp
          ? attendeeData.whatsapp.trim()
          : null;

        let attendee = await Attendee.findOne({
          where: {
            whatsapp: normalizedWhatsapp,
            email: normalizedEmail,
          },
          transaction: t,
        });

        if (!attendee) {
          attendee = await Attendee.create(
            {
              ...attendeeData,
              email: normalizedEmail,
              whatsapp: normalizedWhatsapp,
            },
            { transaction: t }
          );
        }
        const linkedSubeventCount = await SubEventAttendee.count({
          where: {
            attendee_id: attendee.attendee_id,
            subevent_id: { [Op.in]: eventSubeventIds },
          },
          transaction: t,
        });
        if (linkedSubeventCount === totalSubeventCount) {
          await t.rollback();
          return next(
            new ApiError(
              400,
              `Attendee with email ${normalizedEmail} already assigned a global pass for this event`
            )
          );
        }
        // Check for existing issued pass
        await OrderItemAttendee.create(
          {
            order_item_id: orderItem.order_item_id,
            attendee_id: attendee.attendee_id,
            assigned_date: new Date(),
          },
          { transaction: t }
        );

        // Link attendee to order item
        await OrderItemAttendee.create(
          {
            order_item_id: orderItem.order_item_id,
            attendee_id: attendee.attendee_id,
            assigned_date: new Date(),
          },
          { transaction: t }
        );
      }

      await t.commit();

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
      return next(
        new ApiError(500, "Failed to create global pass order", error)
      );
    }
  }
);

const createOrderForBillingUser = asyncHandler(async (req, res, next) => {
  const { subevent_id, billing_user_id, total_amount, attendees } = req.body;

  const t = await sequelize.transaction();

  try {
    const subevent = await SubEvent.findOne({
      where: { subevent_id, is_active: true },
      transaction: t,
    });
    if (!subevent) {
      await t.rollback();
      return next(new ApiError(404, "Subevent not found or inactive"));
    }

    if (subevent.available_quantity < attendees.length) {
      await t.rollback();
      return next(
        new ApiError(
          400,
          "Not enough available quantity for the selected subevent"
        )
      );
    }

    // 1. Aggregate passes and verify quantities and pricing
    // key = pass_id, value = quantity requested
    const passQtyMap = new Map();
    for (const attendee of attendees) {
      if (!attendee.pass_id) {
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
      await t.rollback();
      return next(
        new ApiError(400, "One or more passes are invalid or inactive")
      );
    }

    // 3. Calculate total price from passes and quantities
    let calculatedTotal = 0;
    for (const pass of passes) {
      const qty = passQtyMap.get(pass.pass_id);
      if (qty > 5) {
        await t.rollback();
        return next(new ApiError(400, "Pass quantity exceeds limit of 5"));
      }
      calculatedTotal += parseFloat(pass.final_price) * qty;
    }

    if (parseFloat(total_amount).toFixed(2) !== calculatedTotal.toFixed(2)) {
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
      },
      { transaction: t }
    );

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

    // 6. Create Attendees, check if exists by { whatsapp, email, subevent_id }
    for (const attendeeData of attendees) {
      const normalizedEmail = attendeeData.email.toLowerCase().trim();
      const normalizedWhatsapp = attendeeData.whatsapp
        ? attendeeData.whatsapp.trim()
        : null;

      let attendee = await Attendee.findOne({
        where: {
          whatsapp: normalizedWhatsapp,
          email: normalizedEmail,
          subevent_id,
        },
        transaction: t,
      });

      if (!attendee) {
        attendee = await Attendee.create(
          {
            ...attendeeData,
            email: normalizedEmail,
            whatsapp: normalizedWhatsapp,
            subevent_id,
          },
          { transaction: t }
        );
      }

      // 7. Link each attendee to appropriate OrderItem via pass_id
      const orderItem = orderItemsMap.get(attendeeData.pass_id);
      if (!orderItem) {
        await t.rollback();
        return next(
          new ApiError(
            400,
            "Pass ID for attendee does not match any order item"
          )
        );
      }

      // Upsert into OrderItemAttendee to avoid duplicates if needed
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

    // 8. Update subevent available_quantity
    subevent.available_quantity -= attendees.length;
    await subevent.save({ transaction: t });

    // Commit transaction
    await t.commit();

    return res
      .status(201)
      .json(new ApiResponse(201, { order }, "Order created successfully"));
  } catch (error) {
    await t.rollback();
    return next(new ApiError(500, "Failed to create order", error));
  }
});

const issuePassToAttendees = asyncHandler(async (req, res, next) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return next(new ApiError(400, "Order ID is required"));
    }

    // 1. Fetch order with associated transaction
    const order = await Order.findByPk(order_id, {
      include: [{ model: Transaction, as: "transaction" }],
    });

    if (!order) {
      return next(new ApiError(404, `Order not found for id: ${order_id}`));
    }

    const transaction = order.transaction;
    if (!transaction) {
      return next(new ApiError(400, "Transaction not found for this order"));
    }

    // 2. Check transaction status
    if (transaction.status !== "success") {
      return next(
        new ApiError(
          400,
          `Transaction status is '${transaction.status}'. Passes can only be issued for successful transactions.`
        )
      );
    }

    // 3. Check amount match (strict equality for cents precision)
    const orderTotal = parseFloat(order.total_amount).toFixed(2);
    const transactionAmount = parseFloat(transaction.amount).toFixed(2);
    if (orderTotal !== transactionAmount) {
      return next(
        new ApiError(
          400,
          `Transaction amount (${transactionAmount}) does not match order total (${orderTotal}).`
        )
      );
    }

    // 4. Fetch order items with pass
    const orderItems = await OrderItem.findAll({
      where: { order_id },
      include: [{ model: Pass, as: "pass" }],
    });

    if (!orderItems.length) {
      return next(new ApiError(400, "No order items found for this order"));
    }

    await Promise.all(
      orderItems.map(async (item) => {
        const order_item_id = item.order_item_id;
        const pass_id = item.pass_id;

        if (!item.pass) {
          throw new ApiError(
            400,
            `Pass not found for order item ${order_item_id}`
          );
        }

        // Get linked subevent(s) for pass (assuming at least one)
        const passSubEvents = await PassSubEvent.findAll({
          where: { pass_id },
          attributes: ["subevent_id"],
        });
        if (!passSubEvents.length) {
          throw new ApiError(400, `No subevents linked with pass ${pass_id}`);
        }
        const subeventIds = passSubEvents.map((pse) => pse.subevent_id);
        const subevents = await SubEvent.findAll({
          where: { subevent_id: subeventIds },
          attributes: ["subevent_id", "date", "name"],
        });
        if (!subevents.length) {
          throw new ApiError(400, `SubEvents not found for pass ${pass_id}`);
        }

        // For simplicity, pick the first subevent for expiry and email context
        const mainSubEvent = subevents[0];
        const subeventDate = new Date(mainSubEvent.date);
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
          throw new ApiError(
            400,
            `No attendees found for order item ${order_item_id}`
          );
        }
        await Promise.all(
          orderItemAttendees.map(async (oia) => {
            const attendee = oia.attendee;
            if (!attendee) return;

            const qrData = await generateQR({
              attendeeId: attendee.attendee_id,
              passId: pass_id,
              orderItemId: order_item_id,
              orderId: order_id,
            });

            if (!qrData || !qrData.data || !qrData.image) {
              throw new ApiError(500, "Failed to generate QR code");
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
              booking_number: null,
              status: "active",
              used_count: 0,
              qr_data: qrData.data,
              qr_image: qrData.image,
              sponsored_pass: false,
            });

            await sendMail(attendee.email, "issuedPass", {
              attendee,
              qrImage: qrData.image,
              passCategory: item.pass.category,
              orderNumber: order_id,
              subeventName: mainSubEvent.name,
              expiryDate: issuedPass.expiry_date,
            });
          })
        );
      })
    );
    return res
      .status(200)
      .json(
        new ApiResponse(200, {}, "Passes issued and emails sent successfully")
      );
  } catch (error) {
    console.error(error);
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const issueGlobalPassToAttendees = asyncHandler(async (req, res, next) => {
  try {
    const { order_id } = req.body;
    if (!order_id) {
      return next(new ApiError(400, "Order ID is required"));
    }

    // 1. Fetch order with transaction and billing user
    const order = await Order.findByPk(order_id, {
      include: [{ model: Transaction, as: "transaction" }],
    });
    if (!order) {
      return next(new ApiError(404, `Order not found for id: ${order_id}`));
    }
    const transaction = order.transaction;
    if (!transaction) {
      return next(new ApiError(400, "Transaction not found for this order"));
    }

    // 2. Validate transaction status
    if (transaction.status !== "success") {
      return next(
        new ApiError(
          400,
          `Transaction status is '${transaction.status}'. Cannot issue passes.`
        )
      );
    }

    // 3. Validate order items count (should be exactly 1 for global pass)
    const orderItems = await OrderItem.findAll({
      where: { order_id },
      include: [{ model: Pass, as: "pass" }],
    });

    if (orderItems.length !== 1) {
      return next(
        new ApiError(400, "Global pass order must have exactly one order item")
      );
    }

    const item = orderItems[0];

    if (!item.pass || !item.pass.is_global) {
      return next(
        new ApiError(400, "The order item does not correspond to a global pass")
      );
    }
    const passSubEvents = await PassSubEvent.findAll({
      where: { pass_id: item.pass.pass_id },
    });

    if (!passSubEvents.length) {
      throw new ApiError(
        400,
        `No subevents linked with global pass ${item.pass.pass_id}`
      );
    }

    const subeventIds = passSubEvents.map((pse) => pse.subevent_id);
    const subevents = await SubEvent.findAll({
      where: { subevent_id: subeventIds },
      attributes: ["subevent_id", "date", "name", "day"],
      order: [["day", "ASC"]],
    });
    if (!subevents.length) {
      return next(
        new ApiError(400, "Subevent linked to global pass not found")
      );
    }

    // 4. Fetch attendees linked to the order item
    const orderItemAttendees = await OrderItemAttendee.findAll({
      where: { order_item_id: item.order_item_id },
      include: [
        {
          model: Attendee,
          as: "attendee",
        },
      ],
    });

    if (!orderItemAttendees.length) {
      return next(
        new ApiError(400, "No attendees found for the global pass order item")
      );
    }

    // 6. Issue passes & send emails in parallel
    await Promise.all(
      orderItemAttendees.map(async (oia) => {
        const attendee = oia.attendee;
        if (!attendee) return;
        // Generate one QR code per subevent; create issued pass per subevent
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

            const qrData = await generateQR({
              attendeeId: attendee.attendee_id,
              passId: item.pass.pass_id,
              orderItemId: item.order_item_id,
              orderId: order_id,
              subeventId: subevent.subevent_id,
            });

            if (!qrData || !qrData.data || !qrData.image) {
              throw new ApiError(500, "Failed to generate QR code");
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
              booking_number: null,
              status: "active",
              used_count: 0,
              qr_data: qrData.data,
              qr_image: qrData.image,
              sponsored_pass: false,
            });

            return {
              subeventName: subevent.name,
              expiryDate,
              qrImage: qrData.image,
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
      })
    );

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
    console.error(error);
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
