import express from "express";
import db from "../database/db.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import { hashPassword, verifyPassword } from "../utils/hash.js";

const router = express.Router();

const countMembers = db.prepare("SELECT COUNT(*) AS total FROM members");
const countActiveMembers = db.prepare("SELECT COUNT(*) AS total FROM members WHERE active = 1");
const getAdminById = db.prepare("SELECT * FROM admins WHERE id = ?");
const updateAdminPassword = db.prepare("UPDATE admins SET password_hash = ? WHERE id = ?");

router.use(authenticate, requireAdmin);

router.get("/session", (req, res) => {
  return res.json({
    admin: {
      id: req.user.adminId,
      email: req.user.email
    }
  });
});

router.get("/overview", (req, res) => {
  const totalMembers = countMembers.get().total;
  const activeMembers = countActiveMembers.get().total;
  return res.json({
    totalMembers,
    activeMembers,
    inactiveMembers: totalMembers - activeMembers
  });
});

router.post("/change-password", async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const adminId = req.user.adminId;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    // Get admin from DB
    const admin = getAdminById.get(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, admin.password_hash);
    if (!isValid) {
      return res.status(403).json({ message: "Current password is incorrect." });
    }

    // Hash new password and update
    const newHash = await hashPassword(newPassword);
    updateAdminPassword.run(newHash, adminId);

    return res.json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

export default router;
