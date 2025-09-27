import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import winston from "winston";
import { checkClientToken } from "../src/middlewares/req.middleware.js";
import "winston-daily-rotate-file";

import { errHandler } from "./middlewares/err.middleware.js";

const app = express();
// Winston Logger Setup
const dailyRotateFileTransport = new winston.transports.DailyRotateFile({
  filename: "logs/application-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
});

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    dailyRotateFileTransport,
  ],
});

const morganStream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

const raw = process.env.CORS_ORIGIN || "";
const allowedOrigins = raw
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// helper to check origin - allow requests without an origin (native apps, curl)
function isOriginAllowed(origin) {
  if (!origin) return true; // allow no-origin requests (mobile/native/backend-to-backend)
  if (allowedOrigins.length === 0) return true; // permissive if no config (change for prod!)
  return allowedOrigins.includes(origin);
}
const corsOptions = {
  origin: function (origin, callback) {
    if (isOriginAllowed(origin)) {
      // note: if origin is falsy (mobile/native), this will still pass and not set an Origin header
      callback(null, true);
    } else {
      callback(new Error("CORS policy: Origin not allowed"), false);
    }
  },
  credentials: true, // required if you use cookies or credentials
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "Origin",
    "X-Requested-With",
    "Cache-Control",
    "refreshToken",
    "x-admin-id",
    "x-api-key",
    "X-Client-Token",
  ],
  exposedHeaders: ["accessToken", "refreshToken", "X-Client-Token"], // instruct browsers which headers to expose to JS
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  optionsSuccessStatus: 204,
  maxAge: 86400, // 24 hours for preflight cache
};

app.use((req, res, next) => {
  // Ensure caches/proxies differentiate per-origin
  res.header("Vary", "Origin");
  next();
});
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Expose-Headers", "accessToken, refreshToken");
  next();
});
app.use(
  express.json({
    limit: "64KB",
  })
);

app.use(express.urlencoded({ extended: true, limit: "64KB" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(helmet());

// Use morgan for HTTP request logging
app.use(morgan("combined", { stream: morganStream })); // Morgan using Winston stream

// Use compression to gzip responses
app.use(compression());

// ---- NEW: respond 503 during graceful shutdown ----
app.locals.shuttingDown = false;
app.use((req, res, next) => {
  if (app.locals.shuttingDown) {
    return res.status(503).json({ message: "Server is shutting down" });
  }
  next();
});
app.use((req, res, next) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
import adminRoutes from "./routes/admin.routes.js";
import eventRoutes from "./routes/event.routes.js";
import employeeRoutes from "./routes/emp.routes.js";
import subeventRoutes from "./routes/subevent.routes.js";
import passRoutes from "./routes/pass.routes.js";
import billingUserRoutes from "./routes/billingUser.routes.js";
import paymentRoutes from "./routes/payment.routes.js";

// Health routes (NEW)
import healthRoutes from "./routes/health.routes.js";
app.use("/_health", healthRoutes); // endpoints: /_health/health, /_health/ready, /_health/live

app.use(checkClientToken);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/event", eventRoutes);
app.use("/api/v1/employee", employeeRoutes);
app.use("/api/v1/subevent", subeventRoutes);
app.use("/api/v1/pass", passRoutes);
app.use("/api/v1/billingUser", billingUserRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.get("/", async (req, res, next) => {
  res.send("hello from server");
});

app.use(errHandler);
export { app, logger };
