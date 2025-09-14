import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const PassSubEvent = sequelize.define(
  "PassSubEvent",
  {
    pass_id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      references: {
        model: "passes",
        key: "pass_id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      field: "pass_id",
    },
    subevent_id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      references: {
        model: "subevents",
        key: "subevent_id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  },
  {
    tableName: "pass_subevents",
    timestamps: false,
    indexes: [
      {
        fields: ["pass_id", "subevent_id"],
        unique: true,
      },
    ],
  }
);

export default PassSubEvent;
