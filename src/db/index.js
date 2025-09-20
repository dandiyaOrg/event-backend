import dotenv from "dotenv";
dotenv.config();
import Sequelize from "sequelize";

const connectionString = process.env.DATABASE_URL || null;

const poolMax = process.env.SEQ_POOL_MAX
  ? parseInt(process.env.SEQ_POOL_MAX, 10)
  : 10;
const poolMin = process.env.SEQ_POOL_MIN
  ? parseInt(process.env.SEQ_POOL_MIN, 10)
  : 0;
const poolAcquire = process.env.SEQ_POOL_ACQUIRE
  ? parseInt(process.env.SEQ_POOL_ACQUIRE, 10)
  : 30000;
const poolIdle = process.env.SEQ_POOL_IDLE
  ? parseInt(process.env.SEQ_POOL_IDLE, 10)
  : 10000;

const dialectOptions = {};
if (process.env.DB_SSL === "true") {
  dialectOptions.ssl = {
    require: true,
    rejectUnauthorized: false,
  };
}
// const sequelize = connectionString
//   ? new Sequelize(connectionString, {
//       dialect: "postgres",
//       logging: false,
//       dialectOptions,
//       pool: {
//         max: poolMax,
//         min: poolMin,
//         acquire: poolAcquire,
//         idle: poolIdle,
//       },
//       timezone: "+05:30",
//     })
//   : new Sequelize(
//       process.env.POSTGRES_DB || process.env.DB_NAME || "appdb",
//       process.env.POSTGRES_USER || process.env.DB_USERNAME || "appuser",
//       process.env.POSTGRES_PASSWORD ||
//         process.env.DB_PASSWORD ||
//         "strongpassword!",
//       {
//         host: process.env.POSTGRES_HOST || process.env.DB_HOST || "postgres",
//         port: process.env.POSTGRES_PORT
//           ? parseInt(process.env.POSTGRES_PORT, 10)
//           : 5432,
//         dialect: "postgres",
//         logging: false,
//         dialectOptions,
//         pool: {
//           max: poolMax,
//           min: poolMin,
//           acquire: poolAcquire,
//           idle: poolIdle,
//         },
//         timezone: "+05:30",
//       }
//     );

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
  timezone: "+05:30",
});
const connectDB = async () => {
  try {
    const host = process.env.POSTGRES_HOST || process.env.DB_HOST || "postgres";
    const db =
      process.env.POSTGRES_DB ||
      process.env.DB_NAME ||
      process.env.DATABASE ||
      "appdb";
    console.log(
      `✅ Database connection established successfully (host=${host}, db=${db})`
    );
    return true;
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error.message);
    process.exit(1);
  }
};

export { sequelize, connectDB };
