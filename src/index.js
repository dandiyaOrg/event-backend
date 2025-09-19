import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import { connectDB } from "./db/index.js";
import { app } from "./app.js";
import { sequelize } from "./db/index.js";
import syncModels from "./db/models/index.js";

const startServer = async () => {
  try {
    // Step 1: Connect to database
    console.log("🔄 Connecting to database...");
    await connectDB();
    console.log("✅ Database connected successfully");

    // Step 2: Just verify connection (no sync)
    await sequelize.authenticate();
    console.log("✅ Database connection verified");
    console.log("ℹ️ Syncing database models");
    await syncModels();

    // Step 3: Start the server immediately
    const myport = process.env.PORT || 8000;
    const server = app.listen(myport, () => {
      console.log(`🚀 Server is running at port ${myport}`);
      console.log("🎉 Application started successfully!");
    });

    server.on("error", (err) => {
      console.error("❌ Error in running server:", err);
      process.exit(1);
    });

    const gracefulShutdown = async (signal) => {
      console.log(`\n📡 Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        try {
          await sequelize.close();
          console.log("✅ Database connection closed");
          process.exit(0);
        } catch (error) {
          console.error("❌ Error closing database connection:", error);
          process.exit(1);
        }
      });
      setTimeout(() => process.exit(1), 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("❌ Failed to start application:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
};

startServer();

// Todos:
// 1. Error stack trace in all the responses
// return next(new ApiError(500, "Failed to create order", [{ message: error.message, stack: error.stack }], error.stack));

// 2. for a single event no need to create more than one global pass

// 3. Transaction schema changes:
// method_of_payment
// source
// 4. Create order for global bass from the billing User
// 5. Subevent date should lie between start and end date of event
// 6.
