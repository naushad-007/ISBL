import express from "express";
import db from "../database/db.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

const listMeetings = db.prepare(
  "SELECT * FROM meetings ORDER BY date ASC, time ASC"
);
const getMeetingById = db.prepare(
  "SELECT * FROM meetings WHERE id = ? LIMIT 1"
);
const insertMeeting = db.prepare(
  "INSERT INTO meetings (title, date, time, meeting_link) VALUES (?, ?, ?, ?)"
);
const updateMeeting = db.prepare(
  "UPDATE meetings SET title = ?, date = ?, time = ?, meeting_link = ? WHERE id = ?"
);
const deleteMeeting = db.prepare("DELETE FROM meetings WHERE id = ?");

// GET /api/meetings (any authenticated user can read)
router.get("/", authenticate, (req, res) => {
  try {
    const meetings = listMeetings.all();
    return res.json({ meetings });
  } catch (error) {
    console.error("Failed to list meetings:", error);
    return res.status(500).json({ message: "Failed to list meetings." });
  }
});

// POST /api/meetings (admin only)
router.post("/", authenticate, requireAdmin, (req, res) => {
  const { title, date, time, meeting_link } = req.body || {};
  if (!title || !date || !time) {
    return res.status(400).json({ message: "Title, date, and time are required." });
  }

  const link = meeting_link ? String(meeting_link).trim() : null;
  if (link && !link.startsWith("http://") && !link.startsWith("https://")) {
    return res.status(400).json({ message: "Meeting link must start with http:// or https://." });
  }

  try {
    const result = insertMeeting.run(title.trim(), date.trim(), time.trim(), link);
    const meeting = getMeetingById.get(result.lastInsertRowid);
    return res.status(201).json({ meeting });
  } catch (error) {
    console.error("Failed to create meeting:", error);
    return res.status(500).json({ message: "Failed to create meeting." });
  }
});

// PUT /api/meetings/:id (admin only)
router.put("/:id", authenticate, requireAdmin, (req, res) => {
  const meetingId = Number(req.params.id);
  const existing = getMeetingById.get(meetingId);
  if (!existing) {
    return res.status(404).json({ message: "Meeting not found." });
  }

  const title = req.body?.title ?? existing.title;
  const date = req.body?.date ?? existing.date;
  const time = req.body?.time ?? existing.time;
  const meeting_link = req.body?.meeting_link !== undefined ? req.body.meeting_link : existing.meeting_link;

  if (!title || !date || !time) {
    return res.status(400).json({ message: "Title, date, and time are required." });
  }

  const link = meeting_link ? String(meeting_link).trim() : null;
  if (link && !link.startsWith("http://") && !link.startsWith("https://")) {
    return res.status(400).json({ message: "Meeting link must start with http:// or https://." });
  }

  try {
    updateMeeting.run(title.trim(), date.trim(), time.trim(), link, meetingId);
    const updated = getMeetingById.get(meetingId);
    return res.json({ meeting: updated });
  } catch (error) {
    console.error("Failed to update meeting:", error);
    return res.status(500).json({ message: "Failed to update meeting." });
  }
});

// DELETE /api/meetings/:id (admin only)
router.delete("/:id", authenticate, requireAdmin, (req, res) => {
  const meetingId = Number(req.params.id);
  const existing = getMeetingById.get(meetingId);
  if (!existing) {
    return res.status(404).json({ message: "Meeting not found." });
  }

  try {
    deleteMeeting.run(meetingId);
    return res.json({ removed: meetingId });
  } catch (error) {
    console.error("Failed to delete meeting:", error);
    return res.status(500).json({ message: "Failed to delete meeting." });
  }
});

export default router;
