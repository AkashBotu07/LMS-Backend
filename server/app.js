// server/app.js
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

// routers
import userRoute from "../routes/user.route.js";
import courseRoute from "../routes/course.route.js";
import mediaRoute from "../routes/media.route.js";
import purchaseRoute from "../routes/purchaseCourse.route.js";
import courseProgressRoute from "../routes/courseProgress.route.js";

const app = express();

// default middleware
app.use(express.json());
app.use(cookieParser());

// CORS: read frontend origin from env (set FRONTEND_URL in Vercel)
// Fallback to localhost for local dev
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));

// mount routes
app.use("/api/v1/media", mediaRoute);
app.use("/api/v1/user", userRoute);
app.use("/api/v1/course", courseRoute);
app.use("/api/v1/purchase", purchaseRoute);
app.use("/api/v1/progress", courseProgressRoute);

export default app;
