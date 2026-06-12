import { getMeetingsApi, addMeetingApi, updateMeetingApi, deleteMeetingApi } from "./api.js";
import { byId, setLoading, toast } from "./ui.js";

export const renderDashboardMeetings = async () => {
  const container = byId("dashboard-meetings-list");
  if (!container) return;
  container.innerHTML = '<div class="empty"><span class="spin"></span>&nbsp;Loading meetings...</div>';
  try {
    const { meetings } = await getMeetingsApi();
    if (!meetings || !meetings.length) {
      container.innerHTML = '<div class="empty">No scheduled meetings.</div>';
      return;
    }
    container.innerHTML = meetings.map(m => {
      const joinBtn = m.meeting_link ? 
        `<a href="${m.meeting_link}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm inline-block mt-2" aria-label="Join meeting: ${m.title}">Join Meeting</a>` : '';
      return `
        <div class="stat-card p-4 rounded-xl border border-white/10 bg-[#171717] mb-3">
          <h4 class="text-sm font-semibold text-zinc-100">${m.title}</h4>
          <p class="text-xs text-zinc-400 mt-1">Date: ${m.date} | Time: ${m.time}</p>
          ${joinBtn}
        </div>
      `;
    }).join('');
  } catch (e) {
    container.innerHTML = `<div class="err text-xs text-red-400">Failed to load meetings: ${e.message}</div>`;
  }
};

export const renderAdminMeetings = async () => {
  const container = byId("admin-meetings-list");
  if (!container) return;
  container.innerHTML = '<div class="empty"><span class="spin warn"></span>&nbsp;Loading meetings...</div>';
  try {
    const { meetings } = await getMeetingsApi();
    if (!meetings || !meetings.length) {
      container.innerHTML = '<div class="empty">No scheduled meetings.</div>';
      return;
    }
    container.innerHTML = meetings.map(m => {
      const linkDisplay = m.meeting_link ? `<p class="text-xs text-zinc-500 truncate mt-1">Link: <a href="${m.meeting_link}" target="_blank" class="text-teal-400 hover:underline">${m.meeting_link}</a></p>` : '';
      return `
        <div class="stat-card p-4 rounded-xl border border-white/10 bg-[#171717] mb-3 flex justify-between items-center">
          <div>
            <h4 class="text-sm font-semibold text-zinc-100">${m.title}</h4>
            <p class="text-xs text-zinc-400 mt-1">Date: ${m.date} | Time: ${m.time}</p>
            ${linkDisplay}
          </div>
          <div class="flex gap-2">
            <button class="btn btn-secondary btn-sm" data-meet-action="edit" data-id="${m.id}" data-title="${m.title}" data-date="${m.date}" data-time="${m.time}" data-link="${m.meeting_link || ''}">Edit</button>
            <button class="btn btn-danger btn-sm" data-meet-action="delete" data-id="${m.id}">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    container.innerHTML = `<div class="err text-xs text-red-400">Failed to load meetings: ${e.message}</div>`;
  }
};

export const bindMeetingForm = () => {
  const form = byId("meeting-form");
  if (!form) return;
  
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = byId("meet-id").value;
    const title = byId("meet-title").value.trim();
    const date = byId("meet-date").value;
    const time = byId("meet-time").value;
    const meeting_link = byId("meet-link").value.trim() || null;
    const errEl = byId("meet-err");
    const submitBtn = byId("meet-submit-btn");
    
    errEl.textContent = "";
    
    if (meeting_link && !meeting_link.startsWith("http://") && !meeting_link.startsWith("https://")) {
      errEl.textContent = "Meeting link must start with http/https.";
      return;
    }
    
    setLoading(submitBtn, true, id ? "Updating..." : "Scheduling...");
    try {
      if (id) {
        await updateMeetingApi(id, { title, date, time, meeting_link });
        toast("Meeting updated successfully.");
      } else {
        await addMeetingApi({ title, date, time, meeting_link });
        toast("Meeting scheduled successfully.");
      }
      form.reset();
      byId("meet-id").value = "";
      byId("meeting-form-title").textContent = "Schedule New Meeting";
      submitBtn.textContent = "+ Schedule";
      byId("meet-cancel-btn")?.classList.add("hidden");
      await renderAdminMeetings();
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      setLoading(submitBtn, false, id ? "Save Changes" : "+ Schedule");
    }
  });
  
  byId("meet-cancel-btn")?.addEventListener("click", () => {
    form.reset();
    byId("meet-id").value = "";
    byId("meeting-form-title").textContent = "Schedule New Meeting";
    byId("meet-submit-btn").textContent = "+ Schedule";
    byId("meet-cancel-btn").classList.add("hidden");
  });
};

export const bindAdminMeetingActions = () => {
  const container = byId("admin-meetings-list");
  if (!container) return;
  
  container.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-meet-action]");
    if (!btn) return;
    
    const action = btn.dataset.meetAction;
    const id = btn.dataset.id;
    
    if (action === "delete") {
      if (confirm("Are you sure you want to delete this meeting?")) {
        try {
          await deleteMeetingApi(id);
          toast("Meeting deleted.");
          await renderAdminMeetings();
        } catch (err) {
          toast(err.message, "err");
        }
      }
    } else if (action === "edit") {
      byId("meet-id").value = id;
      byId("meet-title").value = btn.dataset.title;
      byId("meet-date").value = btn.dataset.date;
      byId("meet-time").value = btn.dataset.time;
      byId("meet-link").value = btn.dataset.link;
      byId("meeting-form-title").textContent = "Edit Meeting";
      byId("meet-submit-btn").textContent = "Save Changes";
      byId("meet-cancel-btn")?.classList.remove("hidden");
      byId("meet-title").focus();
    }
  });
};
