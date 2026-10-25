
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const STORAGE_KEY = "focusflow-data-v1";
const quotes = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Great things are done by a series of small things brought together.", author: "Vincent van Gogh" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "You don't have to be perfect. You just have to begin.", author: "Unknown" },
  { text: "Small progress is still progress.", author: "Unknown" },
  { text: "It is never too late to be what you might have been.", author: "George Eliot" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" }
];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.tasks)) return saved;
  } catch (error) {
    console.warn("Could not load saved planner data.", error);
  }
  return { name: "Student", tasks: [], studyDate: todayKey(), studySeconds: 0, lastQuote: -1 };
}

let data = loadData();
let activeFilter = "all";
let quoteIndex = data.lastQuote ?? -1;
let toastTimeout;

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    showToast("Unable to save data in this browser.");
  }
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 2400);
}

function renderIcons() {
  if (window.lucide) lucide.createIcons();
}

function updateDate() {
  const now = new Date();
  $("#todayDate").textContent = now.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" :
    hour < 17 ? "Good afternoon" : "Good evening";

  $("#greeting").replaceChildren();
  $("#greeting").append(document.createTextNode(`${greeting}, ${data.name} `));
  const star = document.createElement("span");
  star.textContent = "✦";
  $("#greeting").append(star);

  $("#profileName").textContent = data.name;
  $(".avatar").textContent = [...data.name][0]?.toUpperCase() || "S";
}

function renderQuote(random = false) {
  if (random) {
    if (quotes.length > 1 && quoteIndex === quotes.length - 1) {
      quoteIndex = Math.floor(Math.random() * (quotes.length - 1));
    } else {
      let next;
      do {
        next = Math.floor(Math.random() * quotes.length);
      } while (next === quoteIndex);
      quoteIndex = next;
    }
  } else {
    quoteIndex = (data.lastQuote >= 0 && data.lastQuote < quotes.length)
      ? data.lastQuote
      : Math.floor(Math.random() * quotes.length);
  }

  data.lastQuote = quoteIndex;
  $("#quoteText").textContent = quotes[quoteIndex].text;
  $("#quoteAuthor").textContent = `— ${quotes[quoteIndex].author}`;
  saveData();
}

function createTaskRow(task) {
  const row = document.createElement("div");
  row.className = `task-row${task.done ? " done" : ""}`;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-check";
  checkbox.checked = task.done;
  checkbox.setAttribute("aria-label", `Complete ${task.title}`);
  checkbox.addEventListener("change", () => toggleTask(task.id));

  const info = document.createElement("div");
  info.className = "task-info";

  const title = document.createElement("p");
  title.className = "task-title";
  title.textContent = task.title;

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const subject = document.createElement("span");
  subject.className = "subject-chip";
  subject.textContent = task.subject;

  meta.append(subject);

  if (task.priority) {
    const priority = document.createElement("span");
    priority.className = `priority-chip ${task.priority}`;
    priority.textContent = `${task.priority} priority`;
    meta.append(priority);
  }

  info.append(title, meta);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "delete-task";
  remove.setAttribute("aria-label", `Delete ${task.title}`);
  remove.innerHTML = '<i data-lucide="trash-2"></i>';
  remove.addEventListener("click", () => deleteTask(task.id));

  row.append(checkbox, info, remove);
  return row;
}

function renderTaskList(container, tasks) {
  container.replaceChildren();
  tasks.forEach(task => container.append(createTaskRow(task)));
  renderIcons();
}

function renderTasks() {
  const pending = data.tasks.filter(task => !task.done);
  const completed = data.tasks.filter(task => task.done);
  const filtered = data.tasks.filter(task => {
    if (activeFilter === "pending") return !task.done;
    if (activeFilter === "completed") return task.done;
    return true;
  });

  renderTaskList($("#dashboardTasks"), pending.slice(0, 5));
  renderTaskList($("#fullTaskList"), filtered);

  $("#dashboardEmpty").hidden = pending.length > 0;
  $("#fullTaskEmpty").hidden = filtered.length > 0;

  // On the dashboard, show the five most recently added unfinished tasks.
  $("#completedCount").replaceChildren();
  $("#completedCount").append(
    document.createTextNode(String(completed.length))
  );
  const total = document.createElement("small");
  total.textContent = ` / ${data.tasks.length}`;
  $("#completedCount").append(total);

  $("#remainingCount").textContent = pending.length;
  const percent = data.tasks.length
    ? Math.round(completed.length / data.tasks.length * 100)
    : 0;

  $("#taskProgress").style.width = `${percent}%`;
  $("#taskPercent").textContent = `${percent}%`;
}

function addTask(title, subject, priority = "Medium") {
  const cleanTitle = title.trim();
  if (!cleanTitle) return;

  data.tasks.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: cleanTitle,
    subject,
    priority,
    done: false,
    createdAt: new Date().toISOString()
  });

  saveData();
  renderTasks();
  showToast("Task added to your planner!");
}

function toggleTask(id) {
  const task = data.tasks.find(item => item.id === id);
  if (!task) return;

  task.done = !task.done;
  saveData();
  renderTasks();

  if (task.done) showToast("Nice work! Task completed.");
}

function deleteTask(id) {
  data.tasks = data.tasks.filter(task => task.id !== id);
  saveData();
  renderTasks();
  showToast("Task deleted.");
}

// Dashboard quick-add form
$("#taskForm").addEventListener("submit", event => {
  event.preventDefault();
  addTask($("#taskInput").value, $("#taskSubject").value);
  $("#taskInput").value = "";
  $("#taskInput").focus();
});

// Full task management form
$("#fullTaskForm").addEventListener("submit", event => {
  event.preventDefault();
  addTask(
    $("#fullTaskInput").value,
    $("#fullTaskSubject").value,
    $("#taskPriority").value
  );
  $("#fullTaskInput").value = "";
  $("#fullTaskInput").focus();
});

// Navigation between dashboard sections
function openView(viewId) {
  const view = document.getElementById(viewId);
  if (!view) return;

  $$(".view").forEach(section => section.classList.remove("active-view"));
  view.classList.add("active-view");

  $$(".nav-link").forEach(button => {
    const active = button.dataset.view === viewId;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$(".nav-link").forEach(button => {
  button.addEventListener("click", () => openView(button.dataset.view));
});

$$("[data-go]").forEach(button => {
  button.addEventListener("click", () => openView(button.dataset.go));
});

$("#quickAdd").addEventListener("click", () => {
  openView("tasks");
  $("#fullTaskInput").focus();
});

$$(".filter-btn").forEach(button => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    $$(".filter-btn").forEach(btn =>
      btn.classList.toggle("active", btn === button)
    );
    renderTasks();
  });
});

// Edit the display name
$("#profileButton").addEventListener("click", () => {
  const name = prompt("What should FocusFlow call you?", data.name);
  if (name === null) return;

  const cleanName = name.trim().slice(0, 30);
  if (!cleanName) {
    showToast("Please enter a name.");
    return;
  }

  data.name = cleanName;
  saveData();
  updateDate();
  showToast(`Welcome, ${cleanName}!`);
});

// Daily quotes
$("#newQuote").addEventListener("click", () => renderQuote(true));

// Keep study time separated by calendar day
if (data.studyDate !== todayKey()) {
  data.studyDate = todayKey();
  data.studySeconds = 0;
  saveData();
}

// Shared timer state for both timer displays
let timerDuration = 25 * 60;
let secondsLeft = timerDuration;
let timerMode = "Focus time";
let timerRunning = false;
let timerInterval = null;
let lastTick = null;

function formatTime(seconds) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function drawTimer() {
  const time = formatTime(secondsLeft);
  const modeLabel = timerMode.toUpperCase();
  const status = timerRunning ? "You're doing great — keep going!" : "Ready when you are";
  const progress = timerDuration ? (timerDuration - secondsLeft) / timerDuration : 0;
  const degrees = Math.min(360, Math.max(0, progress * 360));

  $("#timerDisplay").textContent = time;
  $("#roomTimerDisplay").textContent = time;
  $("#timerMode").textContent = modeLabel;
  $("#roomTimerMode").textContent = modeLabel;
  $("#timerStatus").textContent = status;
  $("#roomTimerStatus").textContent = status;

  document.querySelectorAll(".timer-ring, .big-timer-ring").forEach(ring => {
    ring.style.background =
      `conic-gradient(var(--primary) ${degrees}deg, #eeeaff ${degrees}deg)`;
  });

  $("#timerStart").innerHTML = timerRunning
    ? '<i data-lucide="pause"></i> Pause'
    : '<i data-lucide="play"></i> Start focus';

  $("#roomTimerStart").innerHTML = timerRunning
    ? '<i data-lucide="pause"></i> Pause session'
    : '<i data-lucide="play"></i> Start session';

  $("#studyTime").replaceChildren();
  $("#studyTime").append(
    document.createTextNode(String(Math.floor(data.studySeconds / 60)))
  );
  const unit = document.createElement("small");
  unit.textContent = " min";
  $("#studyTime").append(unit);

  $$(".mode-btn").forEach(button => {
    button.classList.toggle(
      "active",
      Number(button.dataset.minutes) * 60 === timerDuration &&
      button.dataset.mode === timerMode
    );
  });

  renderIcons();
}

function stopTimer() {
  timerRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
  lastTick = null;
}

function tick() {
  const now = Date.now();
  const elapsed = Math.max(0, Math.floor((now - lastTick) / 1000));
  if (!elapsed) return;
  lastTick += elapsed * 1000;

  const actualElapsed = Math.min(elapsed, secondsLeft);
  secondsLeft -= actualElapsed;

  if (timerMode === "Focus time") {
    data.studySeconds += actualElapsed;
  }

  if (secondsLeft <= 0) {
    secondsLeft = 0;
    stopTimer();
    saveData();
    drawTimer();
    showToast(timerMode === "Focus time"
      ? "Focus session complete! Time for a break."
      : "Break complete! Ready to focus again?");
    return;
  }

  if (actualElapsed > 0) saveData();
  drawTimer();
}

function startPauseTimer() {
  if (timerRunning) {
    // Count the elapsed time before pausing.
    tick();
    if (!timerRunning) return;
    stopTimer();
    drawTimer();
    return;
  }

  if (secondsLeft <= 0) secondsLeft = timerDuration;

  timerRunning = true;
  lastTick = Date.now();
  timerInterval = setInterval(tick, 250);
  drawTimer();
}

function resetTimer() {
  stopTimer();
  secondsLeft = timerDuration;
  drawTimer();
}

function chooseMode(button) {
  stopTimer();
  timerMode = button.dataset.mode;
  timerDuration = Number(button.dataset.minutes) * 60;
  secondsLeft = timerDuration;
  drawTimer();
}

$("#timerStart").addEventListener("click", startPauseTimer);
$("#roomTimerStart").addEventListener("click", startPauseTimer);
$("#timerReset").addEventListener("click", resetTimer);
$("#roomTimerReset").addEventListener("click", resetTimer);

$$(".mode-btn").forEach(button => {
  button.addEventListener("click", () => chooseMode(button));
});

// Initialize the application
updateDate();
renderQuote();
renderTasks();
drawTimer();
renderIcons();
  
