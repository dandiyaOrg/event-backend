import { sequelize } from "../index.js";
import Admin from "./admin.model.js";
import Employee from "./employee.model.js";
import Event from "./event.model.js";
import SubEvent from "./subevent.model.js";
import Pass from "./pass.model.js";
import Attendee from "./attendee.model.js";
import BillingUser from "./billingUser.model.js";
import Order from "./order.model.js";
import OrderItem from "./order.item.model.js";
import OrderItemAttendee from "./orderItemAttendee.js";
import Transaction from "./transaction.model.js";
import IssuedPass from "./issuedpass.model.js";
import CheckingRecord from "./checkin.record.model.js";
import PassSubEvent from "./pass.subevent.model.js";

// Define associations
const defineAssociations = () => {
  // ==================== ADMIN RELATIONSHIPS ====================

  // Admin → Employee (One-to-Many)
  Admin.hasMany(Employee, {
    foreignKey: "admin_id",
    as: "employees",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  Employee.belongsTo(Admin, {
    foreignKey: "admin_id",
    as: "admin",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  // Admin → Event (One-to-Many)
  Admin.hasMany(Event, {
    foreignKey: "admin_id",
    as: "events",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  Event.belongsTo(Admin, {
    foreignKey: "admin_id",
    as: "admin",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  // ==================== EVENT RELATIONSHIPS ====================

  // Event → SubEvent (One-to-Many)
  Event.hasMany(SubEvent, {
    foreignKey: "event_id",
    as: "subevents",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  SubEvent.belongsTo(Event, {
    foreignKey: "event_id",
    as: "event",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
  // ==================== PASS RELATIONSHIPS ====================
  Pass.belongsToMany(SubEvent, {
    through: PassSubEvent,
    foreignKey: "pass_id",
    otherKey: "subevent_id",
    as: "subevents",
  });

  SubEvent.belongsToMany(Pass, {
    through: PassSubEvent,
    foreignKey: "subevent_id",
    otherKey: "pass_id",
    as: "passes",
  });
  // ==================== BILLING & ORDER RELATIONSHIPS ====================

  // BillingUser → Order (One-to-Many)
  BillingUser.hasMany(Order, {
    foreignKey: "billing_user_id",
    as: "orders",
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  });

  Order.belongsTo(BillingUser, {
    foreignKey: "billing_user_id",
    as: "billing_user",
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  });

  // Order → OrderItem (One-to-Many)
  Order.hasMany(OrderItem, {
    foreignKey: "order_id",
    as: "order_items",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  OrderItem.belongsTo(Order, {
    foreignKey: "order_id",
    as: "order",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  // OrderItem → Pass (Many-to-One)
  OrderItem.belongsTo(Pass, {
    foreignKey: "pass_id",
    as: "pass",
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  });

  Pass.hasMany(OrderItem, {
    foreignKey: "pass_id",
    as: "order_items",
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  });

  // Order → Transaction (One-to-One)
  Order.hasOne(Transaction, {
    foreignKey: "order_id",
    as: "transaction",
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  });

  Transaction.belongsTo(Order, {
    foreignKey: "order_id",
    as: "order",
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  });

  // ==================== ORDER ITEM ATTENDEE RELATIONSHIPS ====================

  // OrderItem → OrderItemAttendee (One-to-Many)
  OrderItem.hasMany(OrderItemAttendee, {
    foreignKey: "order_item_id",
    as: "attendee_assignments",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  OrderItemAttendee.belongsTo(OrderItem, {
    foreignKey: "order_item_id",
    as: "order_item",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  // Attendee → OrderItemAttendee (One-to-Many)
  Attendee.hasMany(OrderItemAttendee, {
    foreignKey: "attendee_id",
    as: "order_item_assignments",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  OrderItemAttendee.belongsTo(Attendee, {
    foreignKey: "attendee_id",
    as: "attendee",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  // ==================== ISSUED PASS RELATIONSHIPS ====================

  // Attendee → IssuedPass (One-to-Many)
  Attendee.hasMany(IssuedPass, {
    foreignKey: "attendee_id",
    as: "issued_passes",
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  });

  IssuedPass.belongsTo(Attendee, {
    foreignKey: "attendee_id",
    as: "attendee",
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  });

  // SubEvent → IssuedPass (One-to-Many)
  SubEvent.hasMany(IssuedPass, {
    foreignKey: "subevent_id",
    as: "issued_passes",
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  });

  IssuedPass.belongsTo(SubEvent, {
    foreignKey: "subevent_id",
    as: "subevent",
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  });

  // OrderItem → IssuedPass (One-to-Many)
  OrderItem.hasMany(IssuedPass, {
    foreignKey: "order_item_id",
    as: "issued_passes",
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  });

  IssuedPass.belongsTo(OrderItem, {
    foreignKey: "order_item_id",
    as: "order_item",
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  });

  // ==================== CHECKING RECORD RELATIONSHIPS ====================

  // Attendee → CheckingRecord (One-to-Many)

  // IssuedPass → CheckingRecord (One-to-Many)

  IssuedPass.belongsTo(CheckingRecord, {
    foreignKey: "issued_pass_id",
    as: "checking_records",
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  });

  CheckingRecord.belongsTo(IssuedPass, {
    foreignKey: "issued_pass_id",
    as: "pass",
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  });

  // Employee → CheckingRecord (One-to-Many)
  Employee.hasMany(CheckingRecord, {
    foreignKey: "employee_id",
    as: "checking_records",
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  });

  CheckingRecord.belongsTo(Employee, {
    foreignKey: "employee_id",
    as: "employee",
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  });

  // ==================== MANY-TO-MANY RELATIONSHIPS ====================

  // OrderItem ↔ Attendee (through OrderItemAttendee)
  OrderItem.belongsToMany(Attendee, {
    through: OrderItemAttendee,
    foreignKey: "order_item_id",
    otherKey: "attendee_id",
    as: "attendees",
  });

  Attendee.belongsToMany(OrderItem, {
    through: OrderItemAttendee,
    foreignKey: "attendee_id",
    otherKey: "order_item_id",
    as: "order_items",
  });
  console.log("✅ All model associations defined successfully");
};

// Export models and sequelize instance
export {
  sequelize,
  Admin,
  Employee,
  Event,
  SubEvent,
  Pass,
  Attendee,
  BillingUser,
  Order,
  OrderItem,
  OrderItemAttendee,
  Transaction,
  IssuedPass,
  CheckingRecord,
  defineAssociations,
};

// Function to sync all models
const syncModels = async (options = {}) => {
  try {
    await sequelize.sync(options);
    defineAssociations();
    console.log("✅ All models synchronized successfully");
  } catch (error) {
    console.error("❌ Error synchronizing models:", error);
    throw error;
  }
};

export default syncModels;
