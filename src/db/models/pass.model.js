import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const Pass = sequelize.define(
  "Pass",
  {
    pass_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      field: "pass_id",
    },
    category: {
      type: DataTypes.ENUM(
        "Group",
        "Stag Male",
        "Stag Female",
        "Couple",
        "Full Pass"
      ),
      allowNull: false,
      validate: {
        notEmpty: true,
        isIn: [["Group", "Stag Male", "Stag Female", "Couple", "Full Pass"]],
      },
    },
    total_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
        isDecimal: true,
      },
    },
    discount_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0.0,
      validate: {
        min: 0,
        max: 100,
        isDecimal: true,
      },
    },
    final_price: {
      type: DataTypes.VIRTUAL,
      get() {
        const totalPrice = parseFloat(this.getDataValue("total_price")) || 0;
        const discountPercentage =
          parseFloat(this.getDataValue("discount_percentage")) || 0;
        return (totalPrice - (totalPrice * discountPercentage) / 100).toFixed(
          2
        );
      },
    },
    validity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 10000,
      },
    },
    is_global: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
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
    tableName: "passes",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["is_active"],
      },
      {
        fields: ["category"], // Composite index
      },
    ],
    hooks: {
      beforeValidate: (pass, options) => {
        if (pass.discount_percentage > 100) {
          pass.discount_percentage = 100;
        }
        if (pass.discount_percentage < 0) {
          pass.discount_percentage = 0;
        }
      },
    },
  }
);

export default Pass;
