import Sequelize from "sequelize";
// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";
// import { config } from "./config.js";

// Get environment
// const env = process.env.NODE_ENV || "development";
// const dbConfig = config[env];

// Create Sequelize instance

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const caPath = path.resolve(__dirname, "ca.pem");
// const sslOptions = {
//   rejectUnauthorized: false,
//   ca: fs.readFileSync(caPath).toString(),
// };

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
    await sequelize.authenticate();
    console.log(
      `✅ Database connection established successfully (${process.env.DATABASE_URL})`
    );
    console.log(`📍 Connected to: ${process.env.DATABASE_URL}`);
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error.message);
    process.exit(1);
  }
};

export { sequelize, connectDB };
