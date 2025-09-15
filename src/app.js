import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import winston from "winston";
import "winston-daily-rotate-file";

import { errHandler } from "./middlewares/err.middleware.js";

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

const corsOptions = {
  origin: process.env.CORS_ORIGIN,
  credentials: true,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "Origin",
    "X-Requested-With",
    "Cache-Control",
    "refreshToken",
    "x-admin-id",
  ],
};
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
// app.use(passport.initialize());
// app.use(passport.session());

import adminRoutes from "./routes/admin.routes.js";
import eventRoutes from "./routes/event.routes.js";
import employeeRoutes from "./routes/emp.routes.js";
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/event", eventRoutes);
app.use("/api/v1/employee", employeeRoutes);

app.get("/", async (req, res, next) => {
  res.send("hello from server");
});

app.use(errHandler);
export { app, logger };
