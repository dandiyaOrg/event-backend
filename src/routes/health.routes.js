// ./routes/health.routes.js
import express from "express";
import { sequelize } from "../db/index.js";

const router = express.Router();

// Liveness - is the process up?
router.get("/live", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    pid: process.pid,
  });
});

// Readiness - is the app ready to accept traffic? (DB connectivity check)
router.get("/ready", async (req, res) => {
  try {
    // lightweight DB check
    await sequelize.authenticate({ retry: { match: [], max: 0 } });
    return res.status(200).json({ status: "ready" });
  } catch (err) {
    return res.status(503).json({
      status: "not_ready",
      error: err.message,
    });
  }
});

// Overall health - combines simple checks + metadata
router.get("/health", async (req, res) => {
  const health = {
    status: "ok",
    uptime: process.uptime(),
    pid: process.pid,
    env: process.env.NODE_ENV || "development",
  };

  try {
    await sequelize.authenticate({ retry: { match: [], max: 0 } });
    health.db = { status: "connected" };
    return res.status(200).json(health);
  } catch (err) {
    health.db = { status: "error", message: err.message };
    return res.status(503).json(health);
  }
});

export default router;
