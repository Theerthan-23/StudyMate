
// =====================================
// STUDYMATE - BACKEND CONNECTED SCRIPT
// =====================================

// DATA FROM BACKEND
let tasks = [];
let assignments = [];
let exams = [];

// CURRENT DATE
function dateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// SAFE TEXT DISPLAY
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

// CHECK WHETHER A TASK IS COMPLETED TODAY
function isTaskCompletedToday(task) {
    return Array.isArray(task.completedDates) &&
        task.completedDates.includes(dateKey());
}

// SHOW API ERRORS
function showError(error) {
    console.error("StudyMate API error:", error);
    alert(error.message || "Something went wrong. Please try again.");
}

// =====================================
// DAILY TASK API OPERATIONS
// =====================================

// ADD DAILY TASK
async function addTask(name) {
    if (!name.trim()) return false;

    try {
        const newTask = await StudyMateAPI.request("/api/tasks", {
            method: "POST",
            body: JSON.stringify({
                name: name.trim(),
                date: dateKey(),
                completed: false,
                completedAt: null,
                completedDates: []
            })
        });

        tasks.push(newTask);
        renderPage();
        return true;

    } catch (error) {
        showError(error);
        return false;
    }
}

// TOGGLE DAILY TASK
async function toggleTask(id) {
    const task = tasks.find(t => String(t.id) === String(id));
    if (!task) return;

    const today = dateKey();

    const updatedDates = Array.isArray(task.completedDates)
        ? [...task.completedDates]
        : [];

    const index = updatedDates.indexOf(today);

    if (index !== -1) {
        updatedDates.splice(index, 1);
    } else {
        updatedDates.push(today);
    }

    const completed = updatedDates.includes(today);

    try {
        const updatedTask = await StudyMateAPI.request(
            `/api/tasks/${encodeURIComponent(id)}`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    completed: completed,
                    completedAt: completed ? new Date().toISOString() : null,
                    completedDates: updatedDates
                })
            }
        );

        Object.assign(task, updatedTask);
        renderPage();

    } catch (error) {
        showError(error);
        renderPage();
    }
}

// DELETE DAILY TASK
async function deleteTask(id) {
    try {
        await StudyMateAPI.request(
            `/api/tasks/${encodeURIComponent(id)}`,
            { method: "DELETE" }
        );

        tasks = tasks.filter(t => String(t.id) !== String(id));
        renderPage();

    } catch (error) {
        showError(error);
    }
}

// =====================================
// ASSIGNMENT API OPERATIONS
// =====================================

// ADD ASSIGNMENT
async function addAssignment(name, dueDate) {
    if (!name.trim() || !dueDate) return false;

    try {
        const newAssignment = await StudyMateAPI.request(
            "/api/assignments",
            {
                method: "POST",
                body: JSON.stringify({
                    name: name.trim(),
                    dueDate: dueDate,
                    completed: false
                })
            }
        );

        assignments.push(newAssignment);
        renderPage();
        return true;

    } catch (error) {
        showError(error);
        return false;
    }
}

// TOGGLE ASSIGNMENT
async function toggleAssignment(id) {
    const assignment = assignments.find(
        a => String(a.id) === String(id)
    );

    if (!assignment) return;

    const completed = !assignment.completed;

    try {
        const updatedAssignment = await StudyMateAPI.request(
            `/api/assignments/${encodeURIComponent(id)}`,
            {
                method: "PATCH",
                body: JSON.stringify({ completed })
            }
        );

        Object.assign(assignment, updatedAssignment);
        renderPage();

    } catch (error) {
        showError(error);
        renderPage();
    }
}

// DELETE ASSIGNMENT
async function deleteAssignment(id) {
    try {
        await StudyMateAPI.request(
            `/api/assignments/${encodeURIComponent(id)}`,
            { method: "DELETE" }
        );

        assignments = assignments.filter(
            a => String(a.id) !== String(id)
        );

        renderPage();

    } catch (error) {
        showError(error);
    }
}

// =====================================
// ALL SAVED DAILY TASKS
// =====================================

function todaysTasks() {
    return tasks;
}

// =====================================
// DISPLAY DAILY TASKS
// =====================================

function displayTasks() {
    const list = document.getElementById("taskList");
    if (!list) return;

    const todayTasks = todaysTasks();

    if (todayTasks.length === 0) {
        list.innerHTML =
            '<p class="empty">No tasks yet. Add your first daily goal!</p>';
        return;
    }

    list.innerHTML = todayTasks.map(task => {
        const completed = isTaskCompletedToday(task);

        return `
            <div class="task">
                <input type="checkbox"
                    data-action="toggle-task"
                    data-id="${escapeHTML(task.id)}"
                    ${completed ? "checked" : ""}>

                <span class="task-name ${completed ? "completed" : ""}">
                    ${escapeHTML(task.name)}
                </span>

                <button class="delete-btn"
                    data-action="delete-task"
                    data-id="${escapeHTML(task.id)}">✕</button>
            </div>
        `;
    }).join("");
}

// =====================================
// DISPLAY ASSIGNMENTS
// =====================================

function displayAssignments() {
    const list = document.getElementById("assignmentList");
    if (!list) return;

    if (assignments.length === 0) {
        list.innerHTML =
            '<p class="empty">No assignments yet. Add one above!</p>';
        return;
    }

    list.innerHTML = assignments.map(a => `
        <div class="task">
            <input type="checkbox"
                data-action="toggle-assignment"
                data-id="${escapeHTML(a.id)}"
                ${a.completed ? "checked" : ""}>

            <div class="task-name">
                <span class="${a.completed ? "completed" : ""}">
                    ${escapeHTML(a.name)}
                </span>
                <div class="due-date">
                    Due: ${escapeHTML(a.dueDate)}
                </div>
            </div>

            <button class="delete-btn"
                data-action="delete-assignment"
                data-id="${escapeHTML(a.id)}">✕</button>
        </div>
    `).join("");
}

// =====================================
// UPDATE CONSISTENCY
// =====================================

function updateProgress() {
    const todayTasks = todaysTasks();

    const total = todayTasks.length;

    const completed = todayTasks.filter(
        task => isTaskCompletedToday(task)
    ).length;

    const percentage = total === 0
        ? 0
        : Math.round(completed / total * 100);

    const circle = document.getElementById("progressCircle");
    const percent = document.getElementById("percentage");
    const progressText = document.getElementById("progressText");
    const motivation = document.getElementById("motivation");

    if (circle) {
        circle.style.background =
            `conic-gradient(#5B9CFF ${percentage * 3.6}deg, #34445D 0deg)`;
    }

    if (percent) percent.textContent = percentage + "%";

    if (progressText) {
        progressText.textContent =
            `${completed} of ${total} tasks completed`;
    }

    if (motivation) {
        motivation.textContent =
            percentage === 100 && total > 0
                ? "Amazing! All tasks completed! 🎉"
                : percentage >= 50
                ? "Great progress! Keep going!"
                : percentage > 0
                ? "Good start. You can do this!"
                : "Let's get started!";
    }

    const taskCount = document.getElementById("taskCount");
    if (taskCount) {
        taskCount.textContent = `${completed}/${total}`;
    }

    const assignmentCount =
        document.getElementById("assignmentCount");

    if (assignmentCount) {
        assignmentCount.textContent =
            assignments.filter(a => !a.completed).length;
    }
}

// =====================================
// WEEKLY PRODUCTIVITY GRAPH
// =====================================

function updateGraph() {
    const graph = document.getElementById("weeklyGraph");
    if (!graph) return;

    const days = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - i);

        const key = dateKey(date);

        const count = tasks.filter(task =>
            Array.isArray(task.completedDates) &&
            task.completedDates.includes(key)
        ).length;

        days.push({
            label: date.toLocaleDateString("en-IN", {
                weekday: "short"
            }),
            count: count
        });
    }

    const maximum = Math.max(1, ...days.map(d => d.count));

    graph.innerHTML = days.map(day => {
        const height = day.count / maximum * 100;

        return `
            <div class="bar-item">
                <strong>${day.count}</strong>
                <div class="bar"
                    style="height:${Math.max(height, 2)}%">
                </div>
                <span>${day.label}</span>
            </div>
        `;
    }).join("");
}

// =====================================
// EVENT LISTENERS
// =====================================

document.addEventListener("submit", async function(event) {

    if (event.target.id === "taskForm") {
        event.preventDefault();

        const input = document.getElementById("taskInput");

        const success = await addTask(input.value);

        if (success) {
            input.value = "";
        }
    }

    if (event.target.id === "assignmentForm") {
        event.preventDefault();

        const name = document.getElementById("assignmentInput");
        const date = document.getElementById("assignmentDate");

        const success = await addAssignment(
            name.value,
            date.value
        );

        if (success) {
            name.value = "";
            date.value = "";
        }
    }
});

// HANDLE DELETE BUTTONS
document.addEventListener("click", function(event) {

    const element = event.target.closest("[data-action]");
    if (!element) return;

    const id = element.dataset.id;
    const action = element.dataset.action;

    if (action === "delete-task") {
        deleteTask(id);
    }

    if (action === "delete-assignment") {
        deleteAssignment(id);
    }
});

// HANDLE CHECKBOXES
document.addEventListener("change", function(event) {

    const element = event.target;

    if (!element.dataset.action) return;

    const id = element.dataset.id;

    if (element.dataset.action === "toggle-task") {
        toggleTask(id);
    }

    if (element.dataset.action === "toggle-assignment") {
        toggleAssignment(id);
    }
});

// =====================================
// WEEKLY CONSISTENCY
// =====================================

function updateWeeklyConsistency() {

    const averageElement =
        document.getElementById("weeklyAverage");

    const activeElement =
        document.getElementById("activeDays");

    const completedElement =
        document.getElementById("weeklyCompleted");

    const graph =
        document.getElementById("consistencyWeekGraph");

    if (!averageElement || !activeElement ||
        !completedElement || !graph) return;

    const days = [];

    for (let i = 6; i >= 0; i--) {

        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - i);

        const key = dateKey(date);

        const availableTasks = tasks.filter(task =>
            !task.date || task.date <= key
        );

        const completed = availableTasks.filter(task =>
            Array.isArray(task.completedDates) &&
            task.completedDates.includes(key)
        ).length;

        const total = availableTasks.length;

        const percentage = total === 0
            ? 0
            : Math.round((completed / total) * 100);

        days.push({
            key,
            label: date.toLocaleDateString("en-IN", {
                weekday: "short"
            }),
            completed,
            total,
            percentage
        });
    }

    const weeklyAverage = Math.round(
        days.reduce((sum, day) => sum + day.percentage, 0) / 7
    );

    const activeDays = days.filter(
        day => day.completed > 0
    ).length;

    const weeklyCompleted = days.reduce(
        (sum, day) => sum + day.completed, 0
    );

    averageElement.textContent = weeklyAverage + "%";
    activeElement.textContent = activeDays + "/7";
    completedElement.textContent = weeklyCompleted;

    graph.innerHTML = days.map(day => `
        <div class="consistency-day ${day.key === dateKey() ? "today" : ""}">
            <strong>${day.percentage}%</strong>

            <div class="consistency-bar-track">
                <div class="consistency-bar"
                    style="height:${day.percentage}%">
                </div>
            </div>

            <span>${day.label}</span>
        </div>
    `).join("");
}

// =====================================
// DASHBOARD LIVE SUMMARY
// =====================================

function updateDashboardOverview() {

    const taskCount =
        document.getElementById("dashboardTaskCount");

    if (!taskCount) return;

    const today = dateKey();

    // DAILY TASKS
    const totalTasks = tasks.length;

    const completedTasks = tasks.filter(task =>
        Array.isArray(task.completedDates) &&
        task.completedDates.includes(today)
    ).length;

    const taskPercentage = totalTasks === 0
        ? 0
        : Math.round((completedTasks / totalTasks) * 100);

    taskCount.textContent = `${completedTasks}/${totalTasks}`;

    document.getElementById("dashboardTaskMeta").textContent =
        totalTasks === 0
            ? "No daily tasks added yet"
            : `${taskPercentage}% of today's tasks completed`;

    // ASSIGNMENTS
    const pendingAssignments = assignments.filter(a =>
        !a.completed
    ).length;

    document.getElementById("dashboardAssignmentCount").textContent =
        pendingAssignments;

    document.getElementById("dashboardAssignmentMeta").textContent =
        pendingAssignments === 1
            ? "1 assignment to complete"
            : "Pending assignments";

    // UPCOMING EXAMS
    const upcomingExams = exams.filter(exam =>
        exam.date && exam.date >= today
    ).sort((a, b) => a.date.localeCompare(b.date));

    document.getElementById("dashboardExamCount").textContent =
        upcomingExams.length;

    const examMeta =
        document.getElementById("dashboardExamMeta");

    if (upcomingExams.length === 0) {
        examMeta.textContent = "No upcoming exams";
    } else {
        const nextExam = new Date(
            upcomingExams[0].date + "T00:00:00"
        );

        examMeta.textContent =
            "Next: " + nextExam.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short"
            });
    }

    // TODAY'S CONSISTENCY
    document.getElementById("dashboardConsistencyCount").textContent =
        taskPercentage + "%";

    document.getElementById("dashboardConsistencyMeta").textContent =
        totalTasks === 0
            ? "Add tasks to start tracking"
            : `${completedTasks} of ${totalTasks} tasks completed`;
}

// =====================================
// SMART STUDY PLANNER
// =====================================

function updateDashboardPlanner() {

    const examSubject =
        document.getElementById("plannerExamSubject");

    if (!examSubject) return;

    const examDate =
        document.getElementById("plannerExamDate");

    const examCountdown =
        document.getElementById("plannerExamCountdown");

    const assignmentList =
        document.getElementById("plannerAssignmentList");

    const taskSummary =
        document.getElementById("plannerTaskSummary");

    const taskMessage =
        document.getElementById("plannerTaskMessage");

    const progressBar =
        document.getElementById("plannerProgressBar");

    const today = dateKey();

    // DATE DIFFERENCE
    function daysBetween(dateString) {

        if (!dateString) return 9999;

        const todayDate = new Date(today + "T00:00:00");
        const targetDate = new Date(dateString + "T00:00:00");

        return Math.round(
            (targetDate - todayDate) / (1000 * 60 * 60 * 24)
        );
    }

    // UPCOMING EXAMS
    const upcomingExams = exams
        .filter(exam => exam.date && exam.date >= today)
        .sort((a, b) => {

            const dateCompare = a.date.localeCompare(b.date);

            if (dateCompare !== 0) return dateCompare;

            return (a.time || "").localeCompare(b.time || "");
        });

    if (upcomingExams.length === 0) {

        examSubject.textContent = "No upcoming exams";
        examDate.textContent = "Your schedule is clear";
        examCountdown.textContent = "Add an exam to get started";

    } else {

        const nextExam = upcomingExams[0];
        const remaining = daysBetween(nextExam.date);

        examSubject.textContent = nextExam.subject;

        examDate.textContent = new Date(
            nextExam.date + "T00:00:00"
        ).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });

        if (remaining === 0) {
            examCountdown.textContent = "Your exam is today!";
        } else if (remaining === 1) {
            examCountdown.textContent = "Tomorrow is exam day!";
        } else {
            examCountdown.textContent =
                `${remaining} days remaining`;
        }
    }

    // PRIORITY ASSIGNMENTS
    const pendingAssignments = assignments
        .filter(a => !a.completed)
        .sort((a, b) =>
            (a.dueDate || "9999-12-31").localeCompare(
                b.dueDate || "9999-12-31"
            )
        );

    if (assignmentList) {

        if (pendingAssignments.length === 0) {

            assignmentList.innerHTML =
                '<p class="empty">All caught up! No pending assignments 🎉</p>';

        } else {

            assignmentList.innerHTML = pendingAssignments
                .slice(0, 4)
                .map(a => {

                    const remaining = daysBetween(a.dueDate);

                    let status = "Upcoming";
                    let statusClass = "";

                    if (remaining < 0) {
                        status = "Overdue";
                        statusClass = "urgent";
                    } else if (remaining === 0) {
                        status = "Due today";
                        statusClass = "urgent";
                    } else if (remaining <= 3) {
                        status = `${remaining} days left`;
                        statusClass = "soon";
                    } else {
                        status = `${remaining} days left`;
                    }

                    return `
                        <div class="priority-item">
                            <div>
                                <strong>${escapeHTML(a.name)}</strong>
                                <p>Due: ${escapeHTML(a.dueDate || "Not set")}</p>
                            </div>

                            <span class="priority-status ${statusClass}">
                                ${status}
                            </span>
                        </div>
                    `;
                }).join("");
        }
    }

    // DAILY FOCUS
    const totalTasks = tasks.length;

    const completedTasks = tasks.filter(task =>
        isTaskCompletedToday(task)
    ).length;

    const percentage = totalTasks === 0
        ? 0
        : Math.round((completedTasks / totalTasks) * 100);

    if (taskSummary) {
        taskSummary.textContent =
            `${completedTasks} of ${totalTasks} tasks completed`;
    }

    // FIND MOST URGENT ASSIGNMENT
    const overdue = pendingAssignments.find(a =>
        a.dueDate && daysBetween(a.dueDate) < 0
    );

    const dueToday = pendingAssignments.find(a =>
        a.dueDate && daysBetween(a.dueDate) === 0
    );

    const upcomingAssignment = pendingAssignments.find(a =>
        a.dueDate &&
        daysBetween(a.dueDate) <= 3 &&
        daysBetween(a.dueDate) > 0
    );

    const nextExam = upcomingExams[0];

    if (taskMessage) {

        if (overdue) {
            taskMessage.textContent =
                `Priority: Complete your overdue assignment "${overdue.name}".`;

        } else if (dueToday) {
            taskMessage.textContent =
                `Focus: Finish "${dueToday.name}" today. Its deadline is today!`;

        } else if (nextExam && daysBetween(nextExam.date) <= 3) {
            taskMessage.textContent =
                `Exam alert: Your ${nextExam.subject} exam is approaching. Make time for revision!`;

        } else if (upcomingAssignment) {
            taskMessage.textContent =
                `Recommended: Work on "${upcomingAssignment.name}" before its deadline.`;

        } else if (completedTasks < totalTasks) {
            taskMessage.textContent =
                "You're on track! Complete your remaining daily tasks.";

        } else if (totalTasks > 0) {
            taskMessage.textContent =
                "Amazing! Your daily goals are complete. Keep up the consistency! 🎉";

        } else {
            taskMessage.textContent =
                "Start by adding your daily goals. Your smart recommendations will appear here!";
        }
    }

    if (progressBar) {
        progressBar.style.width = percentage + "%";
    }
}

// =====================================
// REFRESH CURRENT PAGE
// =====================================

function renderPage() {
    displayTasks();
    displayAssignments();
    updateProgress();
    updateGraph();
    updateWeeklyConsistency();
    updateDashboardOverview();
    updateDashboardPlanner();
}

// =====================================
// INITIALIZE FROM BACKEND
// =====================================

async function startStudyMate() {

    try {
        const data = await StudyMateAPI.initialize();

        // No session or initialization failed
        if (!data) return;

        tasks = data.tasks || [];
        assignments = data.assignments || [];
        exams = data.exams || [];

        // Ensure completion history is always an array
        tasks.forEach(task => {
            if (!Array.isArray(task.completedDates)) {
                task.completedDates = [];
            }
        });

        renderPage();

    } catch (error) {
        console.error("StudyMate initialization failed:", error);
        alert("Unable to load your StudyMate data. Please check that the backend server is running and try again.");
    }
}

// START THE APPLICATION
startStudyMate();
