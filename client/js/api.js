const API_BASE = window.ISBL_API_BASE || "http://localhost:4000";
const STORAGE_KEY = "isbl_auth";

const parseResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      window.dispatchEvent(
        new CustomEvent("isbl:auth-error", {
          detail: data
        })
      );
    }
    throw new Error(data.message || "Request failed.");
  }
  return data;
};

export const getAuth = () => {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const setAuth = (auth) => sessionStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
export const clearAuth = () => sessionStorage.removeItem(STORAGE_KEY);

export const apiRequest = async (path, options = {}) => {
  const auth = getAuth();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  return parseResponse(response);
};

export const adminLoginApi = (email, password) =>
  apiRequest("/api/auth/admin-login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

export const teamLoginApi = (name, entryNumber) =>
  apiRequest("/api/auth/team-login", {
    method: "POST",
    body: JSON.stringify({ name, entryNumber })
  });

export const logoutApi = () =>
  apiRequest("/api/auth/logout", {
    method: "POST"
  });

export const getMembersApi = () => apiRequest("/api/members");
export const addMemberApi = (payload) =>
  apiRequest("/api/members", { method: "POST", body: JSON.stringify(payload) });
export const updateMemberApi = (id, payload) =>
  apiRequest(`/api/members/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteMemberApi = (id) =>
  apiRequest(`/api/members/${id}`, { method: "DELETE" });
export const getAdminOverviewApi = () => apiRequest("/api/admin/overview");
export const changePasswordApi = (currentPassword, newPassword, confirmPassword) =>
  apiRequest("/api/admin/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
  });

export const getMeetingsApi = () => apiRequest("/api/meetings");
export const addMeetingApi = (payload) =>
  apiRequest("/api/meetings", { method: "POST", body: JSON.stringify(payload) });
export const updateMeetingApi = (id, payload) =>
  apiRequest(`/api/meetings/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteMeetingApi = (id) =>
  apiRequest(`/api/meetings/${id}`, { method: "DELETE" });

export const getApiBase = () => API_BASE;
