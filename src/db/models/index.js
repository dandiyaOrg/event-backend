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
import EventBillingUsers from "./eventBillingUser.model.js";
import SubEventAttendee from "./subEventAttendee.model.js";

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

  // Pass ↔ SubEvent (Many-to-Many through PassSubEvent)
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

  // PassSubEvent associations for direct access
  PassSubEvent.belongsTo(Pass, {
    foreignKey: "pass_id",
    as: "pass",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  Pass.hasMany(PassSubEvent, {
    foreignKey: "pass_id",
    as: "passSubEvents",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  PassSubEvent.belongsTo(SubEvent, {
    foreignKey: "subevent_id",
    as: "subevent",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  SubEvent.hasMany(PassSubEvent, {
    foreignKey: "subevent_id",
    as: "passSubEvents",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  // ==================== BILLING USER & EVENT MANY-TO-MANY ====================

  BillingUser.belongsToMany(Event, {
    through: EventBillingUsers,
    foreignKey: "billing_user_id",
    otherKey: "event_id",
    as: "events",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  Event.belongsToMany(BillingUser, {
    through: EventBillingUsers,
    foreignKey: "event_id",
    otherKey: "billing_user_id",
    as: "billing_users",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
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

  // ==================== ORDER ITEM & ATTENDEE MANY-TO-MANY ====================

  // OrderItem ↔ Attendee (Many-to-Many through OrderItemAttendee)
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

  // OrderItemAttendee associations for direct access
  OrderItemAttendee.belongsTo(OrderItem, {
    foreignKey: "order_item_id",
    as: "order_item",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  OrderItem.hasMany(OrderItemAttendee, {
    foreignKey: "order_item_id",
    as: "orderItemAttendees",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  OrderItemAttendee.belongsTo(Attendee, {
    foreignKey: "attendee_id",
    as: "attendee",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  Attendee.hasMany(OrderItemAttendee, {
    foreignKey: "attendee_id",
    as: "orderItemAttendees",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  // ==================== SUBEVENT & ATTENDEE MANY-TO-MANY ====================

  // SubEvent ↔ Attendee (Many-to-Many through SubEventAttendee)
  SubEvent.belongsToMany(Attendee, {
    through: SubEventAttendee,
    foreignKey: "subevent_id",
    otherKey: "attendee_id",
    as: "attendees",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  Attendee.belongsToMany(SubEvent, {
    through: SubEventAttendee,
    foreignKey: "attendee_id",
    otherKey: "subevent_id",
    as: "subevents",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  // SubEventAttendee associations for direct access
  SubEventAttendee.belongsTo(SubEvent, {
    foreignKey: "subevent_id",
    as: "subevent",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  SubEvent.hasMany(SubEventAttendee, {
    foreignKey: "subevent_id",
    as: "subeventAttendees",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  SubEventAttendee.belongsTo(Attendee, {
    foreignKey: "attendee_id",
    as: "attendee",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  Attendee.hasMany(SubEventAttendee, {
    foreignKey: "attendee_id",
    as: "subeventAttendees",
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

  // IssuedPass → CheckingRecord (One-to-Many) - FIXED: Changed from belongsTo to hasMany
  IssuedPass.hasMany(CheckingRecord, {
    foreignKey: "issued_pass_id",
    as: "checking_records",
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  });

  CheckingRecord.belongsTo(IssuedPass, {
    foreignKey: "issued_pass_id",
    as: "issued_pass", // Changed alias from "pass" to "issued_pass" for clarity
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
  PassSubEvent,
  EventBillingUsers,
  SubEventAttendee,
};

// Function to sync all models
const syncModels = async (options = {}) => {
  try {
    defineAssociations(); // Call this first to define all associations
    await sequelize.sync(options);
    console.log("✅ All models synchronized successfully");
  } catch (error) {
    console.error("❌ Error synchronizing models:", error);
    throw error;
  }
};

export default syncModels;
