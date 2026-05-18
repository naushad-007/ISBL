import { Server } from "socket.io";
import db from "./database/db.js";
import { verifyToken } from "./utils/jwt.js";

let ioInstance = null;

const sessionLookup = db.prepare(
  "SELECT jti, revoked, expires_at FROM sessions WHERE jti = ? LIMIT 1"
);
const memberLookup = db.prepare("SELECT id, name, entry_number FROM members WHERE id = ? LIMIT 1");
const taskLookup = db.prepare(
  `SELECT t.id, t.title, t.description, t.priority, t.member_id, t.created_at, m.name AS member_name, m.entry_number AS member_entry
   FROM tasks t
   LEFT JOIN members m ON m.id = t.member_id
   WHERE t.id = ?
   LIMIT 1`
);
const listTasks = db.prepare(
  `SELECT t.id, t.title, t.description, t.priority, t.member_id, t.created_at, m.name AS member_name, m.entry_number AS member_entry
   FROM tasks t
   LEFT JOIN members m ON m.id = t.member_id
   ORDER BY
     CASE t.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
     datetime(t.created_at) DESC`
);
const listTasksForMember = db.prepare(
  `SELECT t.id, t.title, t.description, t.priority, t.member_id, t.created_at, m.name AS member_name, m.entry_number AS member_entry
   FROM tasks t
   LEFT JOIN members m ON m.id = t.member_id
   WHERE t.member_id = ?
   ORDER BY
     CASE t.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
     datetime(t.created_at) DESC`
);
const insertTask = db.prepare(
  "INSERT INTO tasks (title, description, priority, member_id) VALUES (?, ?, ?, ?)"
);
const deleteTask = db.prepare("DELETE FROM tasks WHERE id = ?");
const reassignTask = db.prepare("UPDATE tasks SET member_id = ? WHERE id = ?");

const corsOrigin = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const initSocket = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: corsOrigin.length ? corsOrigin : true,
      methods: ["GET", "POST"]
    }
  });

  ioInstance.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Missing socket auth token."));
      }
      const payload = verifyToken(token);
      const session = sessionLookup.get(payload.jti);
      if (!session || session.revoked || new Date(session.expires_at).getTime() < Date.now()) {
        return next(new Error("Invalid socket session."));
      }
      socket.user = payload;
      return next();
    } catch {
      return next(new Error("Socket auth failed."));
    }
  });

  ioInstance.on("connection", (socket) => {
    if (socket.user.role === "admin") {
      socket.join("admins");
      socket.emit("tasks_update", { tasks: listTasks.all() });

      socket.on("request_tasks", () => {
        socket.emit("tasks_update", { tasks: listTasks.all() });
      });

      socket.on("assign_task", (payload = {}, ack) => {
        try {
          const title = String(payload.title || "").trim();
          const description =
            typeof payload.description === "string" ? payload.description.trim() : null;
          const priorityRaw = String(payload.priority || "LOW").toUpperCase();
          const priority = ["HIGH", "MEDIUM", "LOW"].includes(priorityRaw) ? priorityRaw : "LOW";
          const memberId = Number(payload.memberId);

          if (!title) {
            if (typeof ack === "function") ack({ ok: false, message: "Task title is required." });
            return;
          }
          if (!Number.isInteger(memberId) || memberId <= 0) {
            if (typeof ack === "function") ack({ ok: false, message: "A valid member is required." });
            return;
          }

          const member = memberLookup.get(memberId);
          if (!member) {
            if (typeof ack === "function") ack({ ok: false, message: "Selected member was not found." });
            return;
          }

          insertTask.run(title, description || null, priority, memberId);
          ioInstance.to("admins").emit("tasks_update", { tasks: listTasks.all() });
          ioInstance.to(`member:${memberId}`).emit("tasks_update_member", { tasks: listTasksForMember.all(memberId) });
          if (typeof ack === "function") ack({ ok: true });
        } catch (error) {
          if (typeof ack === "function") ack({ ok: false, message: "Failed to assign task." });
        }
      });

      socket.on("remove_task", (payload = {}, ack) => {
        const taskId = Number(payload.taskId);
        if (!Number.isInteger(taskId) || taskId <= 0) {
          if (typeof ack === "function") ack({ ok: false, message: "A valid task is required." });
          return;
        }
        const existingTask = taskLookup.get(taskId);
        if (!existingTask) {
          if (typeof ack === "function") ack({ ok: false, message: "Task not found." });
          return;
        }

        const removedTaskMemberId = existingTask.member_id;
        deleteTask.run(taskId);
        ioInstance.to("admins").emit("tasks_update", { tasks: listTasks.all() });
        if (removedTaskMemberId) {
          ioInstance.to(`member:${removedTaskMemberId}`).emit("tasks_update_member", { tasks: listTasksForMember.all(removedTaskMemberId) });
        }
        if (typeof ack === "function") ack({ ok: true });
      });

      socket.on("reassign_task", (payload = {}, ack) => {
        const taskId = Number(payload.taskId);
        const memberId = Number(payload.memberId);
        if (!Number.isInteger(taskId) || taskId <= 0 || !Number.isInteger(memberId) || memberId <= 0) {
          if (typeof ack === "function") ack({ ok: false, message: "Task and member are required." });
          return;
        }

        const existingTask = taskLookup.get(taskId);
        if (!existingTask) {
          if (typeof ack === "function") ack({ ok: false, message: "Task not found." });
          return;
        }
        const member = memberLookup.get(memberId);
        if (!member) {
          if (typeof ack === "function") ack({ ok: false, message: "Selected member was not found." });
          return;
        }

        reassignTask.run(memberId, taskId);
        
        ioInstance.to("admins").emit("tasks_update", { tasks: listTasks.all() });
        const oldTaskMemberId = existingTask.member_id;
        if (oldTaskMemberId && oldTaskMemberId !== memberId) {
          ioInstance.to(`member:${oldTaskMemberId}`).emit("tasks_update_member", { tasks: listTasksForMember.all(oldTaskMemberId) });
        }
        ioInstance.to(`member:${memberId}`).emit("tasks_update_member", { tasks: listTasksForMember.all(memberId) });
        
        if (typeof ack === "function") ack({ ok: true });
      });
    }
    if (socket.user.role === "team") {
      socket.join("members");
      socket.join(`member:${socket.user.memberId}`);
      
      socket.emit("tasks_update_member", { tasks: listTasksForMember.all(socket.user.memberId) });

      socket.on("request_my_tasks", (_, ack) => {
        socket.emit("tasks_update_member", { tasks: listTasksForMember.all(socket.user.memberId) });
        if (typeof ack === "function") ack({ ok: true });
      });
    }
  });

  return ioInstance;
};

export const getIO = () => ioInstance;

export const emitMemberAdded = (member) => {
  if (!ioInstance) return;
  ioInstance.emit("member-added", member);
  ioInstance.emit("dashboard-sync", { reason: "member-added" });
};

export const emitMemberRemoved = (member) => {
  if (!ioInstance) return;
  ioInstance.emit("member-removed", member);
  ioInstance.emit("dashboard-sync", { reason: "member-removed" });
};

export const emitMemberUpdated = (member) => {
  if (!ioInstance) return;
  ioInstance.emit("member-updated", member);
  ioInstance.emit("dashboard-sync", { reason: "member-updated" });
};

export const emitForceLogout = (memberId, reason) => {
  if (!ioInstance) return;
  ioInstance.to(`member:${memberId}`).emit("force-logout", { reason });
};
