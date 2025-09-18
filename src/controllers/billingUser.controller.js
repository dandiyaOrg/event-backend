import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {
  EventBillingUser,
  BillingUser,
  Admin,
  Event,
  SubEvent,
  Order,
  OrderItem,
  Attendee,
} from "../db/models";

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
    console.error(error);
    return next(new ApiError(500, "Failed to create order", error));
  }
});

export { createBillingUser, createOrderForBillingUser };
