// index.js (modified)
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import { connectDB } from "./db/index.js";
import { app, logger } from "./app.js";
import { sequelize } from "./db/index.js";
import syncModels from "./db/models/index.js";

const startServer = async () => {
  try {
    // Step 1: Connect to database
    logger.info("🔄 Connecting to database...");
    await connectDB();
    logger.info("✅ Database connected successfully");

    // Step 2: Just verify connection (no sync)
    await sequelize.authenticate();
    logger.info("✅ Database connection verified");
    logger.info("ℹ️ Syncing database models");
    await syncModels();

    // Step 3: Start the server immediately
    const myport = process.env.PORT || 8000;
    const server = app.listen(myport, () => {
      logger.info(`🚀 Server is running at port ${myport}`);
      logger.info("🎉 Application started successfully!");
    });

    server.on("error", (err) => {
      logger.error("❌ Error in running server:", err);
      process.exit(1);
    });

    // DB connectivity watchdog: if DB unreachable N times in a row, exit
    let consecutiveDbFailures = 0;
    const DB_FAILURE_THRESHOLD = 3;
    const DB_POLL_INTERVAL_MS = 10_000; // 10s

    const dbMonitor = setInterval(async () => {
      try {
        await sequelize.authenticate();
        if (consecutiveDbFailures > 0) {
          logger.warn("✅ DB is healthy again (resetting failure counter)");
        }
        consecutiveDbFailures = 0;
      } catch (err) {
        consecutiveDbFailures += 1;
        logger.warn(
          `⚠️ DB connectivity check failed (${consecutiveDbFailures}/${DB_FAILURE_THRESHOLD}): ${err.message}`
        );

        // If DB unreachable repeatedly, let the process exit so Docker restart policy can restart the container
        if (consecutiveDbFailures >= DB_FAILURE_THRESHOLD) {
          logger.error(
            `❌ DB unreachable for ${consecutiveDbFailures} checks — exiting process to allow Docker to restart the container`
          );
          // allow logs to flush
          setTimeout(() => process.exit(1), 200);
        }
      }
    }, DB_POLL_INTERVAL_MS);

    const gracefulShutdown = async (signal) => {
      logger.info(`\n📡 Received ${signal}. Starting graceful shutdown...`);
      // signal middleware to return 503 for new requests
      app.locals.shuttingDown = true;

      // stop the DB monitor so it doesn't try to reconnect during shutdown
      clearInterval(dbMonitor);

      // Close HTTP server (stop accepting new connections)
      server.close(async () => {
        try {
          await sequelize.close();
          logger.info("✅ Database connection closed");
          process.exit(0);
        } catch (error) {
          logger.error("❌ Error closing database connection:", error);
          process.exit(1);
        }
      });

      // force exit if shutdown hangs
      setTimeout(() => {
        logger.error("❌ Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    // on startup failure, log and exit
    console.error("❌ Failed to start application:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
};

startServer();
