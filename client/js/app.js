import { ensureRole, getCurrentAuth, loginAdmin, loginTeam, logout, changePassword } from "./auth.js";
import {
  bindAddMemberForm,
  bindAdminMemberActions,
  renderAdminMembers,
  renderDashboardMembers
} from "./members.js";
import {
  renderDashboardMeetings,
  renderAdminMeetings,
  bindMeetingForm,
  bindAdminMeetingActions
} from "./meetings.js";
import { connectRealtime, disconnectRealtime } from "./realtime.js";
import { handleTasksUpdate, handleTaskAdded, handleTaskRemoved, handleTaskReassigned, initAdminTaskPanel, refreshTaskMembers } from "./tasks.js";
import { initMemberTasks } from "./memberTasks.js";
import { byId, clearErrors, goToScreen, initRipple, initTabs, startClock, toast } from "./ui.js";

const initIndex = () => {
  const flash = sessionStorage.getItem("isbl_flash");
  if (flash) {
    toast(flash);
    sessionStorage.removeItem("isbl_flash");
  }

  byId("goto-team-login")?.addEventListener("click", () => goToScreen("team-login"));
  byId("goto-admin-login")?.addEventListener("click", () => goToScreen("admin-login"));
  document.querySelectorAll("[data-back='landing']").forEach((btn) => {
    btn.addEventListener("click", () => {
      clearErrors();
      goToScreen("landing");
    });
  });

  byId("team-login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await loginTeam();
  });
  byId("admin-login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await loginAdmin();
  });
};

const initDashboard = async () => {
  const auth = ensureRole("team");
  if (!auth) return;
  window.addEventListener("isbl:auth-error", async () => {
    disconnectRealtime();
    await logout("Session expired. Please sign in again.");
  });
  byId("u-badge").textContent = auth.user.entryNumber || "MEMBER";
  byId("member-logout-btn").addEventListener("click", async () => {
    disconnectRealtime();
    await logout("Signed out.");
  });
  initTabs("dash-tabs");
  startClock("ds-date", "ds-time");
  await renderDashboardMembers();
  await renderDashboardMeetings();
  const socketInstance = connectRealtime({
    onSync: () => renderDashboardMembers(),
    onForceLogout: async () => {
      disconnectRealtime();
      await logout("Your access has been revoked.");
    }
  });

  if (socketInstance) {
    initMemberTasks(socketInstance, "member-task-board");
  }
};

const initPasswordModal = () => {
  const modal = byId("pwd-modal");
  const toggleBtn = byId("pwd-toggle-btn");
  const closeBtn = byId("pwd-close-btn");
  const cancelBtn = byId("pwd-cancel-btn");
  const form = byId("pwd-form");

  const openModal = () => {
    modal.classList.add("active");
    byId("pwd-current").focus();
  };

  const closeModal = () => {
    modal.classList.remove("active");
    form.reset();
    byId("pwd-error").textContent = "";
  };

  toggleBtn.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await changePassword();
    // Modal will close after logout redirect
  });
};

const initAdmin = async () => {
  const auth = ensureRole("admin");
  if (!auth) return;
  window.addEventListener("isbl:auth-error", async () => {
    disconnectRealtime();
    await logout("Admin session expired. Please sign in again.");
  });
  byId("admin-logout-btn").addEventListener("click", async () => {
    disconnectRealtime();
    await logout("Admin signed out.");
  });
  initTabs("admin-tabs");
  initPasswordModal();
  bindAddMemberForm();
  bindAdminMemberActions();
  bindMeetingForm();
  bindAdminMeetingActions();
  startClock("as-date", "as-time");

  await renderAdminMembers();
  await renderAdminMeetings();

  connectRealtime({
    onSync: async () => {
      await renderAdminMembers();
      await refreshTaskMembers();
    },
    onTasksUpdate: (tasks) => handleTasksUpdate(tasks),
    onTaskAdded: (task) => handleTaskAdded(task),
    onTaskRemoved: (taskId) => handleTaskRemoved(taskId),
    onTaskReassigned: (task) => handleTaskReassigned(task),
    onForceLogout: () => {}
  });

  await initAdminTaskPanel();
};

document.addEventListener("DOMContentLoaded", async () => {
  if (window.location.hostname.endsWith("netlify.app") && !localStorage.getItem("ISBL_API_BASE")) {
    const url = window.prompt(
      "ISBL Portal: Please enter your Railway backend URL (e.g., https://your-backend.up.railway.app):"
    );
    if (url) {
      let cleanUrl = url.trim();
      if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
        cleanUrl = "https://" + cleanUrl;
      }
      if (cleanUrl.endsWith("/")) {
        cleanUrl = cleanUrl.slice(0, -1);
      }
      localStorage.setItem("ISBL_API_BASE", cleanUrl);
      window.location.reload();
      return;
    }
  }

  initRipple();
  const page = document.body.dataset.page;
  if (page === "index") {
    initIndex();
    return;
  }
  if (page === "dashboard") {
    await initDashboard();
    return;
  }
  if (page === "admin") {
    await initAdmin();
    return;
  }

  const auth = getCurrentAuth();
  if (!auth) window.location.href = "./index.html";
});
