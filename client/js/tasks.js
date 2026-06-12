import { fetchMembers } from "./members.js";
import { emitRealtime } from "./realtime.js";
import { byId, toast } from "./ui.js";

const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const PRIORITY_BADGE = {
  HIGH: "bg-red-500/20 text-red-400",
  MEDIUM: "bg-blue-500/20 text-blue-400",
  LOW: "bg-neutral-500/20 text-neutral-400"
};
const PRIORITY_CARD = {
  HIGH: "border-red-500 bg-red-500/5 task-priority-high",
  MEDIUM: "border-blue-500 task-priority-medium",
  LOW: "border-white/20"
};

const state = {
  members: [],
  tasks: [],
  selectedMemberId: null,
  selectedTaskId: null,
  selectedPriority: "MEDIUM",
  filter: "ALL",
  assignOpen: false,
  reassignOpen: false
};

const refs = {
  memberList: null,
  board: null,
  addBtn: null,
  removeBtn: null,
  reassignBtn: null,
  reassignMenu: null,
  reassignList: null,
  assignPanel: null,
  assignForm: null,
  titleInput: null,
  descriptionInput: null,
  memberSelect: null,
  filters: [],
  priorityToggles: [],
  assignError: null
};

const byTaskId = (id) => document.querySelector(`[data-task-id="${id}"]`);

const sortedTasks = (tasks) =>
  [...tasks].sort((a, b) => {
    const byPriority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (byPriority !== 0) return byPriority;
    return b.id - a.id;
  });

const filteredTasks = () => {
  const source = sortedTasks(state.tasks);
  if (state.filter === "ALL") return source;
  return source.filter((task) => task.priority === state.filter);
};

const updateActionState = () => {
  const hasTask = Boolean(state.selectedTaskId);
  refs.removeBtn.disabled = !hasTask;
  refs.reassignBtn.disabled = !hasTask;
  refs.reassignBtn.setAttribute("aria-expanded", String(state.reassignOpen && hasTask));
};

const memberAvatar = (name) =>
  String(name || "U")
    .split(" ")
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const renderMemberSidebar = () => {
  if (!refs.memberList) return;
  if (!state.members.length) {
    refs.memberList.innerHTML =
      '<p class="text-xs text-zinc-500 px-2 py-2">No members available.</p>';
    return;
  }

  refs.memberList.innerHTML = state.members
    .map((member) => {
      const selected = state.selectedMemberId === member.id;
      return `
        <button
          type="button"
          class="w-full flex items-center gap-3 rounded-xl px-3 py-2 border transition duration-200 ease-out ${
            selected
              ? "bg-[#4f98a3]/20 border-[#4f98a3]/70 shadow-[0_0_12px_rgba(79,152,163,0.25)]"
              : "bg-[#171717] border-white/10 hover:bg-[#1f1f1f]"
          }"
          data-member-id="${member.id}"
          aria-label="Select member ${member.name}"
          title="${member.name}">
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-zinc-200">
            ${memberAvatar(member.name)}
          </span>
          <span class="text-sm text-zinc-200 truncate">${member.name}</span>
        </button>
      `;
    })
    .join("");
};

const renderReassignList = () => {
  if (!refs.reassignList) return;
  refs.reassignList.innerHTML = state.members
    .map(
      (member) => `
        <button
          type="button"
          class="w-full text-left rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-white/10 transition duration-150"
          data-reassign-member-id="${member.id}">
          ${member.name}
        </button>`
    )
    .join("");
};

const setAssignPanel = (open) => {
  state.assignOpen = open;
  if (!refs.assignPanel) return;
  refs.assignPanel.classList.toggle("max-h-0", !open);
  refs.assignPanel.classList.toggle("opacity-0", !open);
  refs.assignPanel.classList.toggle("pointer-events-none", !open);
  refs.assignPanel.classList.toggle("max-h-[26rem]", open);
  refs.assignPanel.classList.toggle("opacity-100", open);
};

const closeReassignMenu = () => {
  state.reassignOpen = false;
  refs.reassignMenu.classList.add("hidden");
  updateActionState();
};

const openReassignMenu = () => {
  state.reassignOpen = true;
  refs.reassignMenu.classList.remove("hidden");
  updateActionState();
};

const priorityPill = (priority) =>
  `<span class="inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold tracking-wide ${
    PRIORITY_BADGE[priority]
  }">${priority}</span>`;

const taskCardMarkup = (task, selected) => {
  const assigned = task.member_name || "Unassigned";
  return `
    <article
      class="task-card group relative rounded-xl border border-white/10 border-l-4 ${
        PRIORITY_CARD[task.priority]
      } p-4 transition-all duration-150 ease-out cursor-pointer ${
        selected
          ? "ring-2 ring-offset-2 ring-offset-[#0f0f0f] ring-teal-500 shadow-lg shadow-teal-500/20"
          : "hover:border-white/25"
      } opacity-0 translate-y-1"
      data-task-id="${task.id}"
      role="button"
      tabindex="0"
      aria-label="Task ${task.title}">
      <div class="absolute left-2 top-3 transition-opacity duration-150 ${
        selected ? "opacity-100" : "opacity-0"
      }">
        <i data-lucide="check-circle-2" class="h-4 w-4 text-teal-400"></i>
      </div>
      <div class="pl-6">
        <div class="flex items-start justify-between gap-3">
          <h4 class="text-sm font-semibold text-zinc-100">${task.title}</h4>
          ${priorityPill(task.priority)}
        </div>
        <p class="mt-1 text-xs text-zinc-400">${task.description || "No description"}</p>
        <div class="mt-2 text-[11px] text-zinc-500">Assigned to: ${assigned}</div>
      </div>
    </article>
  `;
};

const animateTaskCardsIn = (newIds = new Set()) => {
  const cards = refs.board.querySelectorAll(".task-card");
  cards.forEach((card, index) => {
    const taskId = Number(card.dataset.taskId);
    if (newIds.has(taskId)) {
      card.classList.add("task-new");
    }
    setTimeout(() => {
      card.classList.remove("opacity-0", "translate-y-1");
      card.classList.add("opacity-100", "translate-y-0");
    }, index * 50);
  });
  window.lucide?.createIcons();
};

const renderTaskBoard = (newIds = new Set()) => {
  const tasks = filteredTasks();
  if (!tasks.length) {
    refs.board.innerHTML =
      '<div class="rounded-xl border border-dashed border-white/15 bg-[#141414] p-6 text-center text-sm text-zinc-500">No tasks for this filter.</div>';
    return;
  }

  refs.board.innerHTML = tasks
    .map((task) => taskCardMarkup(task, state.selectedTaskId === task.id))
    .join("");
  animateTaskCardsIn(newIds);
};

export const handleTasksUpdate = (incomingTasks) => {
  const nextTasks = Array.isArray(incomingTasks) ? incomingTasks : [];
  const previousIds = new Set(state.tasks.map((task) => task.id));
  const nextIds = new Set(nextTasks.map((task) => task.id));
  const removed = [...previousIds].filter((id) => !nextIds.has(id));

  removed.forEach((id) => {
    const node = byTaskId(id);
    if (!node) return;
    node.classList.add("translate-x-full", "opacity-0", "transition-all", "duration-300");
  });

  const newIds = new Set([...nextIds].filter((id) => !previousIds.has(id)));
  const commitRender = () => {
    state.tasks = nextTasks;
    if (state.selectedTaskId && !state.tasks.some((task) => task.id === state.selectedTaskId)) {
      state.selectedTaskId = null;
      closeReassignMenu();
    }
    updateActionState();
    renderTaskBoard(newIds);
  };

  if (removed.length) {
    setTimeout(commitRender, 300);
    return;
  }
  commitRender();
};

/** Incremental: a single task was added */
export const handleTaskAdded = (task) => {
  if (!task) return;
  // Avoid duplicates
  if (state.tasks.some((t) => t.id === task.id)) return;
  state.tasks.push(task);
  renderTaskBoard(new Set([task.id]));
};

/** Incremental: a single task was removed */
export const handleTaskRemoved = (taskId) => {
  if (!taskId) return;
  const node = byTaskId(taskId);
  if (node) {
    node.classList.add("translate-x-full", "opacity-0", "transition-all", "duration-300");
  }
  setTimeout(() => {
    state.tasks = state.tasks.filter((t) => t.id !== taskId);
    if (state.selectedTaskId === taskId) {
      state.selectedTaskId = null;
      closeReassignMenu();
    }
    updateActionState();
    renderTaskBoard();
  }, node ? 300 : 0);
};

/** Incremental: a task was reassigned to a different member */
export const handleTaskReassigned = (task) => {
  if (!task) return;
  const idx = state.tasks.findIndex((t) => t.id === task.id);
  if (idx !== -1) {
    state.tasks[idx] = task;
  } else {
    state.tasks.push(task);
  }
  renderTaskBoard();
};

const setPriorityToggle = (priority) => {
  state.selectedPriority = priority;
  refs.priorityToggles.forEach((button) => {
    const isActive = button.dataset.priority === priority;
    button.classList.toggle("bg-red-500/20", isActive && priority === "HIGH");
    button.classList.toggle("text-red-300", isActive && priority === "HIGH");
    button.classList.toggle("border-red-400/70", isActive && priority === "HIGH");
    button.classList.toggle("bg-blue-500/20", isActive && priority === "MEDIUM");
    button.classList.toggle("text-blue-300", isActive && priority === "MEDIUM");
    button.classList.toggle("border-blue-400/70", isActive && priority === "MEDIUM");
    button.classList.toggle("bg-neutral-500/20", isActive && priority === "LOW");
    button.classList.toggle("text-zinc-300", isActive && priority === "LOW");
    button.classList.toggle("border-neutral-400/70", isActive && priority === "LOW");
  });
};

const bindEvents = () => {
  refs.memberList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-member-id]");
    if (!button) return;
    const memberId = Number(button.dataset.memberId);
    state.selectedMemberId = state.selectedMemberId === memberId ? null : memberId;
    refs.memberSelect.value = state.selectedMemberId ? String(state.selectedMemberId) : "";
    renderMemberSidebar();
  });

  refs.filters.forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.priorityFilter;
      refs.filters.forEach((node) => {
        const isActive = node === button;
        node.classList.toggle("bg-[#4f98a3]/25", isActive);
        node.classList.toggle("border-[#4f98a3]/70", isActive);
        node.classList.toggle("text-teal-200", isActive);
      });
      renderTaskBoard();
    });
  });

  refs.priorityToggles.forEach((button) => {
    button.addEventListener("click", () => {
      setPriorityToggle(button.dataset.priority);
    });
  });

  refs.board.addEventListener("click", (event) => {
    const card = event.target.closest("[data-task-id]");
    if (!card) return;
    const taskId = Number(card.dataset.taskId);
    state.selectedTaskId = state.selectedTaskId === taskId ? null : taskId;
    closeReassignMenu();
    renderTaskBoard();
    updateActionState();
  });

  refs.addBtn.addEventListener("click", () => {
    setAssignPanel(!state.assignOpen);
    if (state.assignOpen) refs.titleInput.focus();
  });

  refs.removeBtn.addEventListener("click", () => {
    if (!state.selectedTaskId) return;
    emitRealtime("remove_task", { taskId: state.selectedTaskId }, (response) => {
      if (!response?.ok) {
        toast(response?.message || "Failed to remove task.", "err");
        return;
      }
      state.selectedTaskId = null;
      updateActionState();
      toast("Task removed.");
    });
  });

  refs.reassignBtn.addEventListener("click", () => {
    if (!state.selectedTaskId) return;
    if (state.reassignOpen) {
      closeReassignMenu();
      return;
    }
    openReassignMenu();
  });

  refs.reassignList.addEventListener("click", (event) => {
    const target = event.target.closest("[data-reassign-member-id]");
    if (!target || !state.selectedTaskId) return;
    const memberId = Number(target.dataset.reassignMemberId);
    emitRealtime("reassign_task", { taskId: state.selectedTaskId, memberId }, (response) => {
      if (!response?.ok) {
        toast(response?.message || "Failed to reassign task.", "err");
        return;
      }
      closeReassignMenu();
      toast("Task reassigned.");
    });
  });

  document.addEventListener("submit", (event) => {
    const form = event.target.closest("#task-assign-form");
    if (!form) return;
    event.preventDefault();
    try {
      refs.assignError.textContent = "";
      const title = refs.titleInput.value.trim();
      const description = refs.descriptionInput.value.trim();
      const memberId = parseInt(refs.memberSelect.value || state.selectedMemberId, 10);
      if (!title) {
        refs.assignError.textContent = "Task title is required.";
        return;
      }
      if (!Number.isInteger(memberId) || memberId <= 0) {
        refs.assignError.textContent = "Please select a member.";
        return;
      }

      emitRealtime(
        "assign_task",
        {
          title,
          description,
          priority: state.selectedPriority,
          memberId
        },
        (response) => {
          try {
            if (!response?.ok) {
              refs.assignError.textContent = response?.message || "Failed to assign task.";
              toast(response?.message || "Failed to assign task.", "err");
              return;
            }
            form.reset();
            setPriorityToggle("MEDIUM");
            refs.memberSelect.value = state.selectedMemberId ? String(state.selectedMemberId) : "";
            setAssignPanel(false);
            toast("Task assigned.");
          } catch (callbackErr) {
            toast(callbackErr.message || "Failed to assign task.", "err");
          }
        }
      );
    } catch (err) {
      toast(err.message || "Failed to assign task.", "err");
    }
  });

  document.addEventListener("click", (event) => {
    if (!state.reassignOpen) return;
    if (!event.target.closest("#task-reassign-wrap")) {
      closeReassignMenu();
    }
  });
};

const renderAssignMemberOptions = () => {
  refs.memberSelect.innerHTML = `
    <option value="">Select a member</option>
    ${state.members
      .map((member) => `<option value="${member.id}">${member.name} (${member.entry_number})</option>`)
      .join("")}
  `;
  refs.memberSelect.value = state.selectedMemberId ? String(state.selectedMemberId) : "";
};

export const refreshTaskMembers = async () => {
  const members = await fetchMembers();
  state.members = members;
  if (state.selectedMemberId && !state.members.some((member) => member.id === state.selectedMemberId)) {
    state.selectedMemberId = null;
  }
  renderMemberSidebar();
  renderReassignList();
  renderAssignMemberOptions();
};

export const initAdminTaskPanel = async () => {
  refs.memberList = byId("task-member-list");
  refs.board = byId("task-board");
  refs.addBtn = byId("task-add-btn");
  refs.removeBtn = byId("task-remove-btn");
  refs.reassignBtn = byId("task-reassign-btn");
  refs.reassignMenu = byId("task-reassign-menu");
  refs.reassignList = byId("task-reassign-list");
  refs.assignPanel = byId("task-assign-panel");
  refs.assignForm = byId("task-assign-form");
  refs.titleInput = byId("task-title");
  refs.descriptionInput = byId("task-description");
  refs.memberSelect = byId("task-member-select");
  refs.assignError = byId("task-assign-error");
  refs.filters = Array.from(document.querySelectorAll("[data-priority-filter]"));
  refs.priorityToggles = Array.from(document.querySelectorAll("[data-priority]"));

  if (!refs.memberList || !refs.board) return;

  await refreshTaskMembers();
  renderTaskBoard();
  bindEvents();
  updateActionState();
  setPriorityToggle("MEDIUM");
  setAssignPanel(false);
  closeReassignMenu();

  // Request tasks once socket is connected (called after connectRealtime in app.js)
  setTimeout(() => emitRealtime("request_tasks"), 100);
};
