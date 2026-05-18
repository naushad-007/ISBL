import { adminLoginApi, clearAuth, getAuth, logoutApi, setAuth, teamLoginApi, changePasswordApi } from "./api.js";
import { byId, setLoading, toast } from "./ui.js";

export const getCurrentAuth = () => getAuth();

export const ensureRole = (role) => {
  const auth = getAuth();
  if (!auth || auth.user.role !== role) {
    window.location.href = "./index.html";
    return null;
  }
  return auth;
};

export const loginTeam = async () => {
  const name = byId("t-name").value.trim();
  const entryNumber = byId("t-entry").value.trim().toUpperCase();
  const error = byId("t-err");
  const button = byId("t-btn");
  error.textContent = "";

  if (!name || !entryNumber) {
    error.textContent = "Name and entry number are required.";
    return;
  }

  setLoading(button, true, "Verifying...");
  try {
    const result = await teamLoginApi(name, entryNumber);
    setAuth(result);
    toast(`Welcome, ${result.user.name}!`);
    window.location.href = "./dashboard.html";
  } catch (e) {
    error.textContent = `❌ ${e.message}`;
  } finally {
    setLoading(button, false, "Access Lab Portal");
  }
};

export const loginAdmin = async () => {
  const email = byId("a-email").value.trim();
  const password = byId("a-pass").value;
  const error = byId("a-err");
  const button = byId("a-btn");
  error.textContent = "";

  if (!email || !password) {
    error.textContent = "Email and password are required.";
    return;
  }

  setLoading(button, true, "Authenticating...");
  try {
    const result = await adminLoginApi(email, password);
    setAuth(result);
    toast("Admin access granted.");
    window.location.href = "./admin.html";
  } catch (e) {
    error.textContent = `❌ ${e.message}`;
  } finally {
    setLoading(button, false, "Admin Sign In");
  }
};

export const logout = async (message = "Signed out.") => {
  try {
    await logoutApi();
  } catch {
    // noop: local cleanup still required
  } finally {
    clearAuth();
    if (message) sessionStorage.setItem("isbl_flash", message);
    window.location.href = "./index.html";
  }
};

export const changePassword = async () => {
  const currentPassword = byId("pwd-current").value;
  const newPassword = byId("pwd-new").value;
  const confirmPassword = byId("pwd-confirm").value;
  const error = byId("pwd-error");
  const button = byId("pwd-submit-btn");

  error.textContent = "";

  // Client-side validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    error.textContent = "All fields are required.";
    return;
  }

  if (newPassword.length < 8) {
    error.textContent = "New password must be at least 8 characters.";
    return;
  }

  if (newPassword !== confirmPassword) {
    error.textContent = "New passwords do not match.";
    return;
  }

  if (currentPassword === newPassword) {
    error.textContent = "New password must be different from current password.";
    return;
  }

  setLoading(button, true, "Updating...");
  try {
    await changePasswordApi(currentPassword, newPassword, confirmPassword);
    toast("Password changed successfully. Please log in again.");
    byId("pwd-current").value = "";
    byId("pwd-new").value = "";
    byId("pwd-confirm").value = "";
    setTimeout(() => {
      logout("Password changed. Please log in again.");
    }, 1500);
  } catch (e) {
    error.textContent = `❌ ${e.message}`;
  } finally {
    setLoading(button, false, "Change Password");
  }
};
