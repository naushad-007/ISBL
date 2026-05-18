import { getApiBase, getAuth } from "./api.js";

let socket = null;

export const connectRealtime = ({ onSync, onForceLogout, onTasksUpdate } = {}) => {
  const auth = getAuth();
  if (!auth?.token || typeof window.io !== "function") return null;
  const syncHandler = typeof onSync === "function" ? onSync : () => {};
  const forceLogoutHandler = typeof onForceLogout === "function" ? onForceLogout : () => {};
  const tasksUpdateHandler = typeof onTasksUpdate === "function" ? onTasksUpdate : () => {};

  socket = window.io(getApiBase(), {
    transports: ["websocket"],
    auth: { token: auth.token }
  });

  socket.on("member-added", syncHandler);
  socket.on("member-removed", syncHandler);
  socket.on("member-updated", syncHandler);
  socket.on("dashboard-sync", syncHandler);
  socket.on("tasks_update", (payload) => {
    tasksUpdateHandler(payload?.tasks || []);
  });
  socket.on("force-logout", forceLogoutHandler);
  socket.on("connect_error", forceLogoutHandler);

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
