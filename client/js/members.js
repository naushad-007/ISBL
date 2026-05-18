import {
  addMemberApi,
  deleteMemberApi,
  getAdminOverviewApi,
  getMembersApi,
  updateMemberApi
} from "./api.js";
import { byId, setLoading, toast } from "./ui.js";

const renderEmpty = (container, message) => {
  container.innerHTML = `<div class="empty">${message}</div>`;
};

export const fetchMembers = async () => {
  const { members } = await getMembersApi();
  return members || [];
};

export const renderDashboardMembers = async () => {
  const container = byId("d-members");
  if (!container) return;
  container.innerHTML = '<div class="empty"><span class="spin"></span>&nbsp;Loading team...</div>';

  const members = await fetchMembers();
  byId("ds-members").textContent = String(members.length);

  if (!members.length) {
    renderEmpty(container, "No active team members.");
    return;
  }

  container.innerHTML = "";
  members.forEach((member) => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.innerHTML = `<div class="chip-dot"></div>${member.name} <span class="chip-meta">(${member.entry_number})</span>`;
    container.appendChild(chip);
  });
};

const adminChipMarkup = (member) => {
  const stateLabel = member.active ? "Disable" : "Enable";
  return `
    <div class="chip-dot"></div>
    <strong>${member.name}</strong>
    <span class="chip-meta">${member.entry_number} · ${member.role}</span>
    <div class="chip-actions">
      <button class="chip-btn" data-action="toggle" data-id="${member.id}" data-active="${member.active ? 1 : 0}">${stateLabel}</button>
      <button class="chip-btn" data-action="edit" data-id="${member.id}">Edit</button>
      <button class="chip-btn warn" data-action="remove" data-id="${member.id}">Remove</button>
    </div>
  `;
};

export const renderAdminMembers = async () => {
  const container = byId("a-members");
  if (!container) return;
  container.innerHTML = '<div class="empty"><span class="spin warn"></span>&nbsp;Loading from DB...</div>';

  const members = await fetchMembers();
  byId("as-members").textContent = String(members.length);

  const overview = await getAdminOverviewApi();
  byId("as-active").textContent = String(overview.activeMembers);

  if (!members.length) {
    renderEmpty(container, "No members in database.");
    return;
  }

  container.innerHTML = "";
  members.forEach((member) => {
    const chip = document.createElement("div");
    chip.className = `chip ${member.active ? "" : "inactive"}`;
    chip.innerHTML = adminChipMarkup(member);
    container.appendChild(chip);
  });
};

export const bindAddMemberForm = () => {
  const form = byId("member-add-form");
  const error = byId("m-err");
  const button = byId("add-btn");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";
    const name = byId("new-name").value.trim();
    const entryNumber = byId("new-entry").value.trim().toUpperCase();
    const role = byId("new-role").value.trim();

    if (!name || !entryNumber || !role) {
      error.textContent = "All fields are required.";
      return;
    }

    setLoading(button, true, "Adding...");
    try {
      await addMemberApi({ name, entryNumber, role, active: true });
      form.reset();
      byId("new-role").value = "Research Scholar";
      toast(`Added ${name} (${entryNumber})`);
      await renderAdminMembers();
    } catch (e) {
      error.textContent = `❌ ${e.message}`;
    } finally {
      setLoading(button, false, "+ Add");
    }
  });
};

const editMember = async (memberId, currentMember) => {
  const name = window.prompt("Update member name:", currentMember.name);
  if (!name) return;
  const entryNumber = window.prompt("Update entry number:", currentMember.entry_number);
  if (!entryNumber) return;
  const role = window.prompt("Update role:", currentMember.role);
  if (!role) return;

  await updateMemberApi(memberId, {
    name: name.trim(),
    entryNumber: entryNumber.trim().toUpperCase(),
    role: role.trim(),
    active: Boolean(currentMember.active)
  });
  toast("Member updated.");
};

export const bindAdminMemberActions = () => {
  const container = byId("a-members");
  if (!container) return;

  container.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const memberId = Number(button.dataset.id);

    try {
      const members = await fetchMembers();
      const member = members.find((item) => item.id === memberId);
      if (!member) return;

      if (action === "remove") {
        const confirmed = window.confirm(`Remove ${member.name} (${member.entry_number}) from team?`);
        if (!confirmed) return;
        await deleteMemberApi(memberId);
        toast(`Removed ${member.name}.`);
      } else if (action === "toggle") {
        const nextActive = !(Number(button.dataset.active) === 1);
        await updateMemberApi(memberId, { active: nextActive });
        toast(nextActive ? "Access enabled." : "Access disabled.");
      } else if (action === "edit") {
        await editMember(memberId, member);
      }

      await renderAdminMembers();
    } catch (e) {
      toast(e.message, "err");
    }
  });
};
