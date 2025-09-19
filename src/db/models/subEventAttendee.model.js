import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const SubEventAttendee = sequelize.define(
  "SubEventAttendee",
  {
    subevent_attendee_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      field: "subevent_attendee_id",
    },
    subevent_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "subevents",
        key: "subevent_id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    attendee_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "attendees",
        key: "attendee_id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    tableName: "subevent_attendees",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["subevent_id", "attendee_id"],
        name: "unique_subevent_attendee",
      },
    ],
  }
);

export default SubEventAttendee;
