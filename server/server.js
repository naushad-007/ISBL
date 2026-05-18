import "dotenv/config";
import http from "http";
import path from "path";
import cors from "cors";
import express from "express";
import { fileURLToPath } from "url";
import db from "./database/db.js";
import { hashPassword } from "./utils/hash.js";
import authRoutes from "./routes/authRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { initSocket } from "./socket.js";

const app = express();
const server = http.createServer(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.resolve(__dirname, "..", "client");

const allowedOrigins = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true
  })
);
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

app.use("/api/auth", authRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/admin", adminRoutes);

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

bootstrap().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
