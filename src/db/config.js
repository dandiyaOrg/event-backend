// src/db/config.js
const config = {
  production: {
    username:
      process.env.DB_USERNAME ||
      process.env.POSTGRES_USER ||
      process.env.PGUSER ||
      "appuser",
    password:
      process.env.DB_PASSWORD ||
      process.env.POSTGRES_PASSWORD ||
      process.env.PGPASSWORD ||
      "strongpassword!",
    database:
      process.env.DB_NAME ||
      process.env.POSTGRES_DB ||
      process.env.PGDATABASE ||
      "appdb",
    host: process.env.DB_HOST || process.env.POSTGRES_HOST || "postgres",
    port: process.env.DB_PORT
      ? parseInt(process.env.DB_PORT, 10)
      : process.env.POSTGRES_PORT
        ? parseInt(process.env.POSTGRES_PORT, 10)
        : 5432,
    dialect: "postgres",
    logging: false,
    timezone: "+05:30",
    // SSL only if explicitly enabled
    ssl: process.env.DB_SSL === "true",
    dialectOptions:
      process.env.DB_SSL === "true"
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : {},
    pool: {
      max: process.env.SEQ_POOL_MAX
        ? parseInt(process.env.SEQ_POOL_MAX, 10)
        : 10,
      min: process.env.SEQ_POOL_MIN
        ? parseInt(process.env.SEQ_POOL_MIN, 10)
        : 0,
      acquire: process.env.SEQ_POOL_ACQUIRE
        ? parseInt(process.env.SEQ_POOL_ACQUIRE, 10)
        : 30000,
      idle: process.env.SEQ_POOL_IDLE
        ? parseInt(process.env.SEQ_POOL_IDLE, 10)
        : 10000,
    },
  },
};

module.exports = config;
