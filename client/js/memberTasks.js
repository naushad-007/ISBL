const state = { tasks: [] };
const refs = { taskContainer: null };
let socketInstance = null;

export const initMemberTasks = (socket, containerId) => {
  socketInstance = socket;
  refs.taskContainer = document.getElementById(containerId);
  
  if (!refs.taskContainer) return;

  // Full-list replacement (initial connection + explicit request)
  socketInstance.on("tasks_update_member", ({ tasks }) => {
    state.tasks = tasks || [];
    renderMemberTasks();
  });

  // Incremental: single task added for this member
  socketInstance.on("task_added_member", ({ task }) => {
    if (!task) return;
    if (state.tasks.some((t) => t.id === task.id)) return;
    state.tasks.push(task);
    renderMemberTasks();
  });

  // Incremental: single task removed for this member
  socketInstance.on("task_removed_member", ({ taskId }) => {
    if (!taskId) return;
    state.tasks = state.tasks.filter((t) => t.id !== taskId);
    renderMemberTasks();
  });

  socketInstance.emit("request_my_tasks");
};

const renderMemberTasks = () => {
  if (!refs.taskContainer) return;
  
  if (!state.tasks.length) {
    refs.taskContainer.innerHTML = '<div class="empty"><span class="text-sm text-zinc-500">No tasks assigned to you.</span></div>';
    return;
  }
  
  refs.taskContainer.innerHTML = state.tasks
    .map(task => {
      const priorityColors = {
        HIGH: 'border-red-500/50 bg-red-500/10 text-red-400',
        MEDIUM: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
        LOW: 'border-white/20 bg-white/5 text-zinc-300'
      };
      
      const priorityClass = priorityColors[task.priority] || priorityColors.LOW;

      return `
      <div class="rounded-xl border border-white/10 bg-[#161616] p-4 mb-3" tabindex="0">
        <div class="flex justify-between items-start gap-3">
          <h4 class="font-semibold text-zinc-100 flex-1">${escapeHtml(task.title)}</h4>
          <span class="text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-md border ${priorityClass}">
            ${task.priority}
          </span>
        </div>
        ${task.description ? `<p class="text-sm text-zinc-400 mt-2">${escapeHtml(task.description).replace(/\\n/g, '<br/>')}</p>` : ''}
        <div class="text-xs text-zinc-600 mt-3 pt-3 border-t border-white/5 flex gap-2">
          ${new Date(task.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
    `}).join("");
};

const escapeHtml = (unsafe) => {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};
