import express from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../database/db.js";
import { signToken } from "../utils/jwt.js";
import { verifyPassword } from "../utils/hash.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

const adminByEmail = db.prepare("SELECT * FROM admins WHERE email = ? LIMIT 1");
const memberByCredentials = db.prepare(
  `SELECT id, name, entry_number, role, active
   FROM members
   WHERE lower(name) = lower(?) AND entry_number = ? LIMIT 1`
);
const createSession = db.prepare(
  "INSERT INTO sessions (jti, user_type, user_id, expires_at) VALUES (?, ?, ?, ?)"
);
const revokeSession = db.prepare("UPDATE sessions SET revoked = 1 WHERE jti = ?");

const createTokenAndSession = ({ role, userId, extra = {} }) => {
  const jti = uuidv4();
  const token = signToken({ role, jti, ...extra });
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  createSession.run(jti, role === "admin" ? "admin" : "team", userId, expiresAt);
  return token;
};

router.post("/admin-login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const admin = adminByEmail.get(email.trim().toLowerCase());
  if (!admin) return res.status(401).json({ message: "Invalid credentials." });

  const valid = await verifyPassword(password, admin.password_hash);
  if (!valid) return res.status(401).json({ message: "Invalid credentials." });

  const token = createTokenAndSession({
    role: "admin",
    userId: admin.id,
    extra: { adminId: admin.id, email: admin.email }
  });

  return res.json({
    token,
    user: { id: admin.id, role: "admin", email: admin.email }
  });
});

router.post("/team-login", (req, res) => {
  const { name, entryNumber } = req.body || {};
  if (!name || !entryNumber) {
    return res.status(400).json({ message: "Name and entry number are required." });
  }

  const member = memberByCredentials.get(name.trim(), entryNumber.trim().toUpperCase());
  if (!member) return res.status(401).json({ message: "Member not found." });
  if (!member.active) return res.status(403).json({ message: "Your access is currently disabled." });

  const token = createTokenAndSession({
    role: "team",
    userId: member.id,
    extra: {
      memberId: member.id,
      name: member.name,
      entryNumber: member.entry_number
    }
  });

  return res.json({
    token,
    user: {
      id: member.id,
      role: "team",
      name: member.name,
      entryNumber: member.entry_number,
      memberRole: member.role
    }
  });
});

router.post("/logout", authenticate, (req, res) => {
  revokeSession.run(req.user.jti);
  return res.json({ message: "Logged out." });
});

export default router;
