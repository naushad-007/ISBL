import { getApiBase, getAuth } from "./api.js";

let socket = null;

export const connectRealtime = ({
  onSync,
  onForceLogout,
  onTasksUpdate,
  onTaskAdded,
  onTaskRemoved,
  onTaskReassigned
} = {}) => {
  const auth = getAuth();
  if (!auth?.token || typeof window.io !== "function") return null;
  const syncHandler = typeof onSync === "function" ? onSync : () => {};
  const forceLogoutHandler = typeof onForceLogout === "function" ? onForceLogout : () => {};
  const tasksUpdateHandler = typeof onTasksUpdate === "function" ? onTasksUpdate : () => {};
  const taskAddedHandler = typeof onTaskAdded === "function" ? onTaskAdded : () => {};
  const taskRemovedHandler = typeof onTaskRemoved === "function" ? onTaskRemoved : () => {};
  const taskReassignedHandler = typeof onTaskReassigned === "function" ? onTaskReassigned : () => {};

  socket = window.io(getApiBase(), {
    transports: ["websocket"],
    auth: { token: auth.token }
  });

  socket.on("member-added", syncHandler);
  socket.on("member-removed", syncHandler);
  socket.on("member-updated", syncHandler);
  socket.on("dashboard-sync", syncHandler);

  // Full-list update (initial connection and explicit requests)
  socket.on("tasks_update", (payload) => {
    tasksUpdateHandler(payload?.tasks || []);
  });

  // Incremental updates (granular, per-mutation events)
  socket.on("task_added", (payload) => taskAddedHandler(payload?.task));
  socket.on("task_removed", (payload) => taskRemovedHandler(payload?.taskId));
  socket.on("task_reassigned", (payload) => taskReassignedHandler(payload?.task));

  socket.on("force-logout", forceLogoutHandler);

  return socket;
};

export const emitRealtime = (event, payload, ack) => {
  if (!socket) return false;
  if (typeof ack === "function") {
    socket.emit(event, payload, ack);
    return true;
  }
  socket.emit(event, payload);
  return true;
};

export const disconnectRealtime = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
