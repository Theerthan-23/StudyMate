
// =====================================
// STUDYMATE - EXAM CALENDAR
// BACKEND CONNECTED
// =====================================

let exams = [];

let currentDate = new Date();
let selectedDate = getDateKey(new Date());

// =====================================
// DATE FUNCTIONS
// =====================================

function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
    const date = new Date(dateString + "T00:00:00");

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// =====================================
// STATISTICS
// =====================================

function updateStats() {
    const today = getDateKey(new Date());

    const upcoming = exams.filter(exam => exam.date >= today);
    const completed = exams.filter(exam => exam.date < today);

    document.getElementById("totalExams").textContent = exams.length;
    document.getElementById("upcomingExams").textContent = upcoming.length;
    document.getElementById("completedExams").textContent = completed.length;
}

// =====================================
// CALENDAR
// =====================================

function renderCalendar() {

    const calendarGrid = document.getElementById("calendarGrid");

    calendarGrid.innerHTML = "";

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    document.getElementById("monthYear").textContent =
        currentDate.toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric"
        });

    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    weekdays.forEach(day => {
        const element = document.createElement("div");
        element.className = "weekday";
        element.textContent = day;
        calendarGrid.appendChild(element);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const previousMonthDays = new Date(year, month, 0).getDate();

    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {

        let dayNumber;
        let date;
        let otherMonth = false;

        if (i < firstDay) {
            dayNumber = previousMonthDays - firstDay + i + 1;
            date = new Date(year, month - 1, dayNumber);
            otherMonth = true;

        } else if (i >= firstDay + daysInMonth) {
            dayNumber = i - firstDay - daysInMonth + 1;
            date = new Date(year, month + 1, dayNumber);
            otherMonth = true;

        } else {
            dayNumber = i - firstDay + 1;
            date = new Date(year, month, dayNumber);
        }

        const dateKey = getDateKey(date);

        const dayExams = exams.filter(
            exam => exam.date === dateKey
        );

        const cell = document.createElement("div");
        cell.className = "calendar-day";

        if (otherMonth) cell.classList.add("other-month");

        if (dateKey === getDateKey(new Date())) {
            cell.classList.add("today");
        }

        if (dateKey === selectedDate) {
            cell.classList.add("selected");
        }

        let dots = "";

        if (dayExams.length > 0) {
            dots = `
                <div class="day-dots">
                    ${dayExams.slice(0, 4).map(() =>
                        '<span class="day-dot"></span>'
                    ).join("")}
                </div>
            `;
        }

        let tooltip = "";

        if (dayExams.length > 0) {
            tooltip = `
                <div class="exam-tooltip">
                    ${dayExams.map(exam => `
                        <div class="tooltip-exam">
                            <strong>${escapeHTML(exam.subject)}</strong><br>
                            ${escapeHTML(exam.time || "Time not set")}<br>
                            ${escapeHTML(exam.venue || "Venue not set")}
                        </div>
                    `).join("")}
                </div>
            `;
        }

        cell.innerHTML = `
            <div class="day-number">${dayNumber}</div>
            ${dots}
            ${tooltip}
        `;

        cell.addEventListener("click", () => {

            selectedDate = dateKey;

            if (otherMonth) {
                currentDate = new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    1
                );
            }

            renderCalendar();
            showSelectedDetails();
        });

        calendarGrid.appendChild(cell);
    }

    updateStats();
}

// =====================================
// UPCOMING EXAMS PANEL
// =====================================

function renderUpcoming() {

    const container = document.getElementById("upcomingList");
    const today = getDateKey(new Date());

    const upcoming = exams
        .filter(exam => exam.date >= today)
        .sort((a, b) => {

            const dateCompare = a.date.localeCompare(b.date);

            if (dateCompare !== 0) return dateCompare;

            return (a.time || "").localeCompare(b.time || "");
        });

    document.getElementById("upcomingCount").textContent =
        `${upcoming.length} exam${upcoming.length !== 1 ? "s" : ""}`;

    if (upcoming.length === 0) {

        container.innerHTML = `
            <div class="empty-upcoming">
                No upcoming exams yet.<br>
                Add your exam schedule and it will appear here.
            </div>
        `;

        return;
    }

    container.innerHTML = upcoming.slice(0, 6).map(exam => {

        const date = new Date(exam.date + "T00:00:00");

        const day = date.getDate();

        const month = date.toLocaleDateString("en-IN", {
            month: "short"
        });

        return `
            <div class="upcoming-item" data-date="${escapeHTML(exam.date)}">

                <div class="date-box">
                    <strong>${day}</strong>
                    <span>${month}</span>
                </div>

                <div class="upcoming-info">
                    <h4>${escapeHTML(exam.subject)}</h4>
                    <p>◷ ${escapeHTML(exam.time || "Time not set")}</p>
                    <p>⌖ ${escapeHTML(exam.venue || "Venue not set")}</p>
                </div>

            </div>
        `;
    }).join("");

    container.querySelectorAll(".upcoming-item").forEach(item => {

        item.addEventListener("click", () => {

            selectedDate = item.dataset.date;

            const date = new Date(selectedDate + "T00:00:00");

            currentDate = new Date(
                date.getFullYear(),
                date.getMonth(),
                1
            );

            renderCalendar();
            showSelectedDetails();
        });
    });
}

// =====================================
// SELECTED DATE DETAILS
// =====================================

function showSelectedDetails() {

    const container = document.getElementById("selectedDetails");

    const dayExams = exams.filter(
        exam => exam.date === selectedDate
    );

    let html = `<h3>${formatDate(selectedDate)}</h3>`;

    if (dayExams.length === 0) {

        html += `
            <p class="no-exam">
                No exams scheduled for this day. Enjoy your free time!
            </p>
        `;

    } else {

        dayExams.forEach(exam => {

            html += `
                <div class="selected-exam">

                    <h4>${escapeHTML(exam.subject)}</h4>

                    <p>◷ ${escapeHTML(exam.time || "Time not specified")}</p>

                    <p>⌖ ${escapeHTML(exam.venue || "Venue not specified")}</p>

                    <p>📚 ${escapeHTML(exam.syllabus || "No syllabus added")}</p>

                    <button class="delete-exam"
                        data-id="${escapeHTML(exam.id)}">
                        Delete Exam
                    </button>

                </div>
            `;
        });
    }

    container.innerHTML = html;

    container.querySelectorAll(".delete-exam").forEach(button => {

        button.addEventListener("click", () => {
            deleteExam(button.dataset.id);
        });
    });
}

// =====================================
// MONTH NAVIGATION
// =====================================

function changeMonth(amount) {

    currentDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + amount,
        1
    );

    renderCalendar();
}

function goToday() {

    currentDate = new Date();

    selectedDate = getDateKey(new Date());

    refreshPage();
}

// =====================================
// ADD EXAM MODAL
// =====================================

function openModal() {

    document.getElementById("examModal").classList.add("show");

    document.getElementById("examDate").value = selectedDate;
}

function closeModal() {

    document.getElementById("examModal").classList.remove("show");

    document.getElementById("examForm").reset();
}

// =====================================
// ADD EXAM - BACKEND
// =====================================

document.getElementById("examForm").addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        const exam = {
            subject: document.getElementById("subject").value.trim(),
            date: document.getElementById("examDate").value,
            time: document.getElementById("examTime").value,
            venue: document.getElementById("examVenue").value.trim(),
            syllabus: document.getElementById("examSyllabus").value.trim()
        };

        if (!exam.subject || !exam.date) return;

        const saveButton = this.querySelector(".save-btn");

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {

            const newExam = await StudyMateAPI.request(
                "/api/exams",
                {
                    method: "POST",
                    body: JSON.stringify(exam)
                }
            );

            exams.push(newExam);

            selectedDate = newExam.date;

            const date = new Date(newExam.date + "T00:00:00");

            currentDate = new Date(
                date.getFullYear(),
                date.getMonth(),
                1
            );

            closeModal();
            refreshPage();

        } catch (error) {

            console.error("Exam creation failed:", error);

            alert(error.message || "Unable to save exam.");

        } finally {

            saveButton.disabled = false;
            saveButton.textContent = "Save Exam";
        }
    }
);

// =====================================
// DELETE EXAM - BACKEND
// =====================================

async function deleteExam(id) {

    const button = document.querySelector(
        `.delete-exam[data-id="${CSS.escape(String(id))}"]`
    );

    if (button) {
        button.disabled = true;
        button.textContent = "Deleting...";
    }

    try {

        await StudyMateAPI.request(
            `/api/exams/${encodeURIComponent(id)}`,
            {
                method: "DELETE"
            }
        );

        exams = exams.filter(
            exam => String(exam.id) !== String(id)
        );

        refreshPage();

    } catch (error) {

        console.error("Exam deletion failed:", error);

        alert(error.message || "Unable to delete exam.");

        showSelectedDetails();
    }
}

// =====================================
// REFRESH ALL SECTIONS
// =====================================

function refreshPage() {

    renderCalendar();
    renderUpcoming();
    showSelectedDetails();
}

// =====================================
// INITIALIZE EXAM PAGE FROM BACKEND
// =====================================

async function startExamPage() {

    try {

        const data = await StudyMateAPI.initialize();

        if (!data) return;

        exams = data.exams || [];

        refreshPage();

    } catch (error) {

        console.error("Exam page initialization failed:", error);

        alert(
            "Unable to load exams. Please check that the backend server is running and try again."
        );
    }
}

// START
startExamPage();
