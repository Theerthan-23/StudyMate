
const API_BASE = "https://studymate-n0lm.onrender.com";

const TOKEN_KEY = "studyMateToken";
const USER_KEY = "studyMateUser";

// =====================================
// AUTHENTICATION HELPERS
// =====================================

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
        return null;
    }
}

function saveSession(data) {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = "login.html";
}

// =====================================
// API REQUEST HANDLER
// =====================================

async function apiRequest(endpoint, options = {}) {
    const token = getToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    let data = null;
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
        data = await response.json();
    }

    if (!response.ok) {
        if (response.status === 401 && token) {
            logout();
        }

        throw new Error(
            data?.detail || "Something went wrong. Please try again."
        );
    }

    return data;
}

// =====================================
// REGISTER
// =====================================

async function registerUser(username, email, password) {
    return await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
            username,
            email: email || null,
            password
        })
    });
}

// =====================================
// LOGIN
// =====================================

async function loginUser(identifier, password) {
    const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
            identifier,
            password
        })
    });

    saveSession(data);
    return data.user;
}

// =====================================
// LEGACY DATA MIGRATION
// =====================================

function getLegacyData(key) {
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
        return [];
    }
}

function legacyId(type, item, index) {
    const originalId = item.id ?? index;
    return `legacy-${type}-${String(originalId)}`.slice(0, 64);
}

async function migrateLegacyData(userId) {
    const migrationKey = `studyMateMigrated_${userId}`;

    if (localStorage.getItem(migrationKey) === "true") {
        return;
    }

    const oldTasks = getLegacyData("studyTasks");
    const oldAssignments = getLegacyData("studyAssignments");
    const oldExams = getLegacyData("studyExams");

    const [existingTasks, existingAssignments, existingExams] =
        await Promise.all([
            apiRequest("/api/tasks"),
            apiRequest("/api/assignments"),
            apiRequest("/api/exams")
        ]);

    const taskIds = new Set(existingTasks.map(item => item.id));
    const assignmentIds = new Set(existingAssignments.map(item => item.id));
    const examIds = new Set(existingExams.map(item => item.id));

    for (let i = 0; i < oldTasks.length; i++) {
        const task = oldTasks[i];
        const id = legacyId("task", task, i);

        if (taskIds.has(id)) continue;

        let completedDates = Array.isArray(task.completedDates)
            ? [...task.completedDates]
            : [];

        if (completedDates.length === 0 && task.completedAt) {
            const oldDate = new Date(task.completedAt);

            if (!isNaN(oldDate.getTime())) {
                const key = [
                    oldDate.getFullYear(),
                    String(oldDate.getMonth() + 1).padStart(2, "0"),
                    String(oldDate.getDate()).padStart(2, "0")
                ].join("-");

                completedDates.push(key);
            }
        }

        if (completedDates.length === 0 && task.completed) {
            completedDates.push(
                task.date || new Date().toISOString().slice(0, 10)
            );
        }

        const today = new Date().toISOString().slice(0, 10);

        await apiRequest("/api/tasks", {
            method: "POST",
            body: JSON.stringify({
                id,
                name: task.name,
                date: task.date || today,
                completed: completedDates.includes(today),
                completedAt: task.completedAt || null,
                completedDates
            })
        });

        taskIds.add(id);
    }

    for (let i = 0; i < oldAssignments.length; i++) {
        const assignment = oldAssignments[i];
        const id = legacyId("assignment", assignment, i);

        if (assignmentIds.has(id)) continue;

        await apiRequest("/api/assignments", {
            method: "POST",
            body: JSON.stringify({
                id,
                name: assignment.name,
                dueDate: assignment.dueDate,
                completed: Boolean(assignment.completed)
            })
        });

        assignmentIds.add(id);
    }

    for (let i = 0; i < oldExams.length; i++) {
        const exam = oldExams[i];
        const id = legacyId("exam", exam, i);

        if (examIds.has(id)) continue;

        await apiRequest("/api/exams", {
            method: "POST",
            body: JSON.stringify({
                id,
                subject: exam.subject,
                date: exam.date,
                time: exam.time || null,
                venue: exam.venue || null,
                syllabus: exam.syllabus || null
            })
        });

        examIds.add(id);
    }

    localStorage.setItem(migrationKey, "true");
}

// =====================================
// LOAD ALL USER DATA
// =====================================

async function initializeStudyMate() {
    if (!getToken()) {
        window.location.href = "login.html";
        return null;
    }

    const user = await apiRequest("/api/auth/me");

    await migrateLegacyData(user.id);

    const [tasks, assignments, exams] = await Promise.all([
        apiRequest("/api/tasks"),
        apiRequest("/api/assignments"),
        apiRequest("/api/exams")
    ]);

    localStorage.setItem(USER_KEY, JSON.stringify(user));

    return {
        user,
        tasks,
        assignments,
        exams
    };
}

// =====================================
// SHARED GLOBAL API
// =====================================

window.StudyMateAPI = {
    request: apiRequest,
    register: registerUser,
    login: loginUser,
    logout,
    getUser,
    getToken,
    initialize: initializeStudyMate
};
