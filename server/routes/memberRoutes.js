import express from "express";
import db from "../database/db.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import {
  emitForceLogout,
  emitMemberAdded,
  emitMemberRemoved,
  emitMemberUpdated
} from "../socket.js";

const router = express.Router();

const listActiveMembers = db.prepare(
  "SELECT id, name, entry_number, role, active, created_at FROM members WHERE active = 1 ORDER BY created_at ASC"
);
const listAllMembers = db.prepare(
  "SELECT id, name, entry_number, role, active, created_at FROM members ORDER BY created_at ASC"
);
const insertMember = db.prepare(
  "INSERT INTO members (name, entry_number, role, active) VALUES (?, ?, ?, ?)"
);
const getMemberById = db.prepare(
  "SELECT id, name, entry_number, role, active, created_at FROM members WHERE id = ? LIMIT 1"
);
const deleteMember = db.prepare("DELETE FROM members WHERE id = ?");
const updateMember = db.prepare(
  "UPDATE members SET name = ?, entry_number = ?, role = ?, active = ? WHERE id = ?"
);

router.use(authenticate);

router.get("/", (req, res) => {
  const members = req.user.role === "admin" ? listAllMembers.all() : listActiveMembers.all();
  return res.json({ members });
});

router.post("/", requireAdmin, (req, res) => {
  const { name, entryNumber, role, active = true } = req.body || {};
  if (!name || !entryNumber) {
    return res.status(400).json({ message: "Name and entry number are required." });
  }

  try {
    const result = insertMember.run(
      name.trim(),
      entryNumber.trim().toUpperCase(),
      (role || "Research Scholar").trim(),
      active ? 1 : 0
    );
    const member = getMemberById.get(result.lastInsertRowid);
    emitMemberAdded(member);
    if (!member.active) {
      emitForceLogout(member.id, "Access was created in disabled mode.");
    }
    return res.status(201).json({ member });
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) {
      return res.status(409).json({ message: "Entry number already exists." });
    }
    return res.status(500).json({ message: "Failed to create member." });
  }
});

router.put("/:id", requireAdmin, (req, res) => {
  const memberId = Number(req.params.id);
  const existing = getMemberById.get(memberId);
  if (!existing) return res.status(404).json({ message: "Member not found." });

  const next = {
    name: (req.body?.name ?? existing.name).trim(),
    entryNumber: (req.body?.entryNumber ?? existing.entry_number).trim().toUpperCase(),
    role: (req.body?.role ?? existing.role).trim(),
    active: typeof req.body?.active === "boolean" ? req.body.active : Boolean(existing.active)
  };

  try {
    updateMember.run(next.name, next.entryNumber, next.role, next.active ? 1 : 0, memberId);
    const updated = getMemberById.get(memberId);
    emitMemberUpdated(updated);
    if (!updated.active) {
      emitForceLogout(updated.id, "Your access has been revoked by admin.");
    }
    return res.json({ member: updated });
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) {
      return res.status(409).json({ message: "Entry number already exists." });
    }
    return res.status(500).json({ message: "Failed to update member." });
  }
});

router.delete("/:id", requireAdmin, (req, res) => {
  const memberId = Number(req.params.id);
  const existing = getMemberById.get(memberId);
  if (!existing) return res.status(404).json({ message: "Member not found." });

  const result = deleteMember.run(memberId);
  if (!result.changes) return res.status(404).json({ message: "Member not found." });

  emitMemberRemoved(existing);
  emitForceLogout(memberId, "Your account has been removed.");
  return res.json({ removed: memberId });
});

export default router;
