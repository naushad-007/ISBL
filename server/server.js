import "dotenv/config";
import http from "http";
import path from "path";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { fileURLToPath } from "url";
import db from "./database/db.js";
import { hashPassword } from "./utils/hash.js";
import { authLimiter, apiLimiter } from "./middleware/rateLimit.js";
import authRoutes from "./routes/authRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import meetingRoutes from "./routes/meetingRoutes.js";
import { initSocket } from "./socket.js";

const app = express();
const server = http.createServer(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.resolve(__dirname, "..", "client");

const allowedOrigins = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.trim().replace(/\/$/, "");
      if (allowedOrigins.length === 0 || allowedOrigins.includes(cleanOrigin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy violation: ${origin} is not allowed.`));
      }
    },
    credentials: true
  })
);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());
app.use(express.static(clientDir));

app.get("/", (_, res) => {
  res.sendFile(path.join(clientDir, "index.html"));
});
app.get("/admin", (_, res) => {
  res.sendFile(path.join(clientDir, "admin.html"));
});
app.get("/dashboard", (_, res) => {
  res.sendFile(path.join(clientDir, "dashboard.html"));
});

app.get("/api/health", (_, res) => {
  res.json({ status: "ok", service: "ISBL backend" });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/members", apiLimiter, memberRoutes);
app.use("/api/admin", apiLimiter, adminRoutes);
app.use("/api/meetings", apiLimiter, meetingRoutes);

const adminLookup = db.prepare("SELECT id FROM admins LIMIT 1");
const createAdmin = db.prepare(
  "INSERT INTO admins (email, password_hash) VALUES (?, ?)"
);

const bootstrap = async () => {
  const admin = adminLookup.get();
  if (!admin) {
    const email = (process.env.ADMIN_EMAIL || "admin@isbl.ac.in").toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "ChangeMe@123";
    const passwordHash = await hashPassword(password);
    createAdmin.run(email, passwordHash);
  }

  initSocket(server);
  const port = Number(process.env.PORT || 4000);
  server.listen(port, "0.0.0.0", () => {
    console.log(`ISBL backend listening on port ${port}`);
  });
};

// Centralized error handler — catches unhandled async/sync errors.
// Prevents stack trace leaks in production.
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  console.error(`[ERROR] ${err.message}`, process.env.NODE_ENV !== "production" ? err.stack : "");
  return res.status(status).json({
    message: status === 500 ? "Internal server error." : err.message
  });
});

bootstrap().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
