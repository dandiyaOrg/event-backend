import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";

import { errHandler } from "./middlewares/err.middleware.js";

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
app.use(morgan("combined")); // 'combined' for detailed Apache-style logs

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
export { app };
