import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const Event = sequelize.define(
  "Event",
  {
    event_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      field: "event_id",
    },
    event_number: {
      type: DataTypes.INTEGER,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
      defaultValue: () => {
        return Math.floor(100000 + Math.random() * 900000);
      },
    },
    event_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 200],
      },
    },
    event_url: {
      type: DataTypes.STRING(200),
      allowNull: true,
      validate: {
        notEmpty: true,
        len: [3, 200],
      },
    },
    event_image: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 200],
      },
    },
    status: {
      type: DataTypes.ENUM(
        "Initiated",
        "Active",
        "Ready",
        "Closed",
        "Cancelled"
      ),
      allowNull: false,
      defaultValue: "Initiated",
      validate: {
        notEmpty: true,
        isIn: [["Initiated", "Active", "Ready", "Closed", "Cancelled"]],
      },
    },
    event_qr: {
      type: DataTypes.STRING(200),
      allowNull: true,
      validate: {
        notEmpty: true,
        len: [3, 200],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    venue: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [5, 500],
      },
    },
    google_map_link: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [5, 500],
      },
    },
    type_of_event: {
      type: DataTypes.ENUM(
        "conference",
        "workshop",
        "seminar",
        "concert",
        "exhibition",
        "sports",
        "festival",
        "other"
      ),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    number_of_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 365,
      },
    },
    date_start: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
        isAfter: new Date().toISOString().split("T")[0], // Must be today or future
      },
    },
    date_end: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
        isAfterStartDate(value) {
          if (value <= this.date_start) {
            throw new Error("End date must be after start date");
          }
        },
      },
    },
    admin_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "admins",
        key: "admin_id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    tableName: "events",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["admin_id"],
      },
      {
        fields: ["date_start"],
      },
      {
        fields: ["date_end"],
      },
      {
        fields: ["type_of_event"],
      },
      {
        fields: ["is_active"],
      },
      {
        fields: ["status"],
      },
    ],
    hooks: {
      beforeValidate: (event, options) => {
        // helper: parse many common inputs and return { year, month, day } or null
        const parseToYMD = (input) => {
          if (!input) return null;

          // If it's already a Date object
          if (input instanceof Date && !Number.isNaN(input.getTime())) {
            return {
              year: input.getFullYear(),
              month: input.getMonth() + 1,
              day: input.getDate(),
            };
          }

          const s = String(input).trim();

          // Try YYYY-MM-DD or similar (ISO)
          const isoMatch = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
          if (isoMatch) {
            return {
              year: Number(isoMatch[1]),
              month: Number(isoMatch[2]),
              day: Number(isoMatch[3]),
            };
          }

          // Try DD-MM-YYYY or DD/MM/YYYY
          const dmyMatch = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
          if (dmyMatch) {
            return {
              year: Number(dmyMatch[3]),
              month: Number(dmyMatch[2]),
              day: Number(dmyMatch[1]),
            };
          }

          // Fallback to Date.parse (may interpret timezones) then extract YMD
          const parsed = new Date(s);
          if (!Number.isNaN(parsed.getTime())) {
            return {
              year: parsed.getFullYear(),
              month: parsed.getMonth() + 1,
              day: parsed.getDate(),
            };
          }

          return null;
        };

        // Converts YMD -> normalized YYYY-MM-DD string (using UTC day to avoid timezone shifts)
        const ymdToIsoDate = ({ year, month, day }) => {
          if (![year, month, day].every(Number.isFinite)) return null;
          // Use Date.UTC to avoid local timezone causing previous/next-day issues
          const ms = Date.UTC(year, month - 1, day);
          const iso = new Date(ms).toISOString().split("T")[0];
          return iso;
        };

        // If either date missing, nothing to do here (validators will catch missing required fields)
        if (!event.date_start && !event.date_end) return;

        // Normalize start
        if (event.date_start) {
          const parsed = parseToYMD(event.date_start);
          if (!parsed) {
            // invalid date format -> let validators handle this (isDate), or optionally throw here
            return;
          }
          const normStart = ymdToIsoDate(parsed);
          if (!normStart) return;
          event.date_start = normStart; // write normalized YYYY-MM-DD
        }

        // Normalize end
        if (event.date_end) {
          const parsed = parseToYMD(event.date_end);
          if (!parsed) {
            return;
          }
          const normEnd = ymdToIsoDate(parsed);
          if (!normEnd) return;
          event.date_end = normEnd;
        }

        // at this point date_start and date_end (if present) are normalized strings 'YYYY-MM-DD'
        if (event.date_start && event.date_end) {
          const startMs = Date.UTC(
            Number(event.date_start.substring(0, 4)),
            Number(event.date_start.substring(5, 7)) - 1,
            Number(event.date_start.substring(8, 10))
          );
          const endMs = Date.UTC(
            Number(event.date_end.substring(0, 4)),
            Number(event.date_end.substring(5, 7)) - 1,
            Number(event.date_end.substring(8, 10))
          );

          if (endMs < startMs) {
            // keep consistent with validators: throw validation error so caller knows
            throw new ValidationError(
              "End date must be the same as or after start date"
            );
          }

          const MS_PER_DAY = 24 * 60 * 60 * 1000;
          const inclusiveDays = Math.floor((endMs - startMs) / MS_PER_DAY) + 1;

          // If number_of_days is not present or doesn't match, set the computed value
          if (
            !event.number_of_days ||
            Number(event.number_of_days) !== inclusiveDays
          ) {
            event.number_of_days = inclusiveDays;
          }
        }
      },
    },
  }
);
export default Event;
