import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import { connectDB, sequelize } from "../db/index.js";
import syncModels from "../db/models/index.js";

const syncDatabase = async () => {
  try {
    console.log("🔄 Connecting to database...");
    await connectDB();
    console.log("✅ Database connected successfully");

    const args = process.argv.slice(2);
    const force = args.includes("--force");
    const alter = args.includes("--alter");

    console.log("🔄 Synchronizing database models...");
    console.log(`   - Force: ${force}`);
    console.log(`   - Alter: ${alter}`);

    await syncModels({ force, alter });
    console.log("✅ Database synchronized successfully");

    await sequelize.close();
    console.log("✅ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Database sync failed:", error);
    process.exit(1);
  }
};

syncDatabase();

export default syncDatabase;
