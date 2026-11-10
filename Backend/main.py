from datetime import datetime
from uuid import uuid4

from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    status
)

from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import Base, engine, get_db

from models import (
    User,
    Task,
    Assignment,
    Exam
)

from schemas import (
    RegisterRequest,
    LoginRequest,
    UserOut,
    TokenOut,

    TaskCreate,
    TaskUpdate,
    TaskOut,

    AssignmentCreate,
    AssignmentUpdate,
    AssignmentOut,

    ExamCreate,
    ExamUpdate,
    ExamOut
)

from security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)


# CREATE DATABASE TABLES
Base.metadata.create_all(bind=engine)


# CREATE FASTAPI APPLICATION
app = FastAPI(
    title="StudyMate API",
    description="Backend API for StudyMate",
    version="1.0.0"
)


# FRONTEND CONNECTION
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)


# USER OUTPUT FORMAT
def user_to_output(user):

    return UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        created_at=(
            user.created_at.isoformat()
            if user.created_at else None
        )
    )


# ==========================================
# HOME AND HEALTH CHECK
# ==========================================

@app.get("/")
def home():

    return {
        "message": "Welcome to StudyMate Backend!",
        "status": "Running successfully"
    }


@app.get("/health")
def health_check():

    return {
        "status": "Healthy",
        "application": "StudyMate"
    }


# ==========================================
# AUTHENTICATION
# ==========================================

# REGISTER
@app.post(
    "/api/auth/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED
)
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db)
):

    username = payload.username.strip()
    email = payload.email

    if email:

        existing_user = db.query(User).filter(
            or_(
                User.username == username,
                User.email == email
            )
        ).first()

    else:

        existing_user = db.query(User).filter(
            User.username == username
        ).first()

    if existing_user:

        raise HTTPException(
            status_code=409,
            detail="Username or email is already registered."
        )

    user = User(
        username=username,
        email=email,
        password_hash=hash_password(payload.password)
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user_to_output(user)


# LOGIN
@app.post(
    "/api/auth/login",
    response_model=TokenOut
)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db)
):

    identifier = payload.identifier.strip()

    user = db.query(User).filter(
        or_(
            User.username == identifier,
            User.email == identifier.lower()
        )
    ).first()

    if user is None or not verify_password(
        payload.password,
        user.password_hash
    ):

        raise HTTPException(
            status_code=401,
            detail="Incorrect username/email or password."
        )

    token = create_access_token(user.id)

    return TokenOut(
        access_token=token,
        user=user_to_output(user)
    )


# GET LOGGED-IN USER
@app.get(
    "/api/auth/me",
    response_model=UserOut
)
def get_profile(
    current_user: User = Depends(get_current_user)
):

    return user_to_output(current_user)


# ==========================================
# DAILY TASKS
# ==========================================

# GET ALL TASKS
@app.get(
    "/api/tasks",
    response_model=list[TaskOut]
)
def list_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    return db.query(Task).filter(
        Task.user_id == current_user.id
    ).order_by(
        Task.date.desc()
    ).all()


# CREATE TASK
@app.post(
    "/api/tasks",
    response_model=TaskOut,
    status_code=status.HTTP_201_CREATED
)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    task_id = payload.id or str(uuid4())

    existing = db.query(Task).filter(
        Task.id == task_id
    ).first()

    if existing:

        raise HTTPException(
            status_code=409,
            detail="A task with this ID already exists."
        )

    completed_at = None

    if payload.completed_at:

        try:

            completed_at = datetime.fromisoformat(
                payload.completed_at.replace("Z", "+00:00")
            )

        except ValueError:

            raise HTTPException(
                status_code=422,
                detail="completedAt must be a valid ISO date/time."
            )

    task = Task(
        id=task_id,
        user_id=current_user.id,
        name=payload.name.strip(),
        date=payload.date,
        completed=payload.completed,
        completed_at=completed_at,
        completed_dates=payload.completed_dates
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    return task


# UPDATE TASK
@app.patch(
    "/api/tasks/{task_id}",
    response_model=TaskOut
)
def update_task(
    task_id: str,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()

    if task is None:

        raise HTTPException(
            status_code=404,
            detail="Task not found."
        )

    changes = payload.model_dump(
        exclude_unset=True
    )

    if "name" in changes and changes["name"] is not None:
        changes["name"] = changes["name"].strip()

    if (
        "completed_at" in changes
        and changes["completed_at"] is not None
    ):

        try:

            changes["completed_at"] = datetime.fromisoformat(
                changes["completed_at"].replace("Z", "+00:00")
            )

        except ValueError:

            raise HTTPException(
                status_code=422,
                detail="completedAt must be a valid ISO date/time."
            )

    for field, value in changes.items():

        setattr(task, field, value)

    db.commit()
    db.refresh(task)

    return task


# DELETE TASK
@app.delete("/api/tasks/{task_id}")
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()

    if task is None:

        raise HTTPException(
            status_code=404,
            detail="Task not found."
        )

    db.delete(task)
    db.commit()

    return {
        "message": "Task deleted successfully."
    }


# ==========================================
# ASSIGNMENTS
# ==========================================

# GET ALL ASSIGNMENTS
@app.get(
    "/api/assignments",
    response_model=list[AssignmentOut]
)
def list_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    return db.query(Assignment).filter(
        Assignment.user_id == current_user.id
    ).order_by(
        Assignment.due_date.asc()
    ).all()


# CREATE ASSIGNMENT
@app.post(
    "/api/assignments",
    response_model=AssignmentOut,
    status_code=status.HTTP_201_CREATED
)
def create_assignment(
    payload: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    assignment_id = payload.id or str(uuid4())

    existing = db.query(Assignment).filter(
        Assignment.id == assignment_id
    ).first()

    if existing:

        raise HTTPException(
            status_code=409,
            detail="An assignment with this ID already exists."
        )

    assignment = Assignment(
        id=assignment_id,
        user_id=current_user.id,
        name=payload.name.strip(),
        due_date=payload.due_date,
        completed=payload.completed
    )

    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return assignment


# UPDATE ASSIGNMENT
@app.patch(
    "/api/assignments/{assignment_id}",
    response_model=AssignmentOut
)
def update_assignment(
    assignment_id: str,
    payload: AssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.user_id == current_user.id
    ).first()

    if assignment is None:

        raise HTTPException(
            status_code=404,
            detail="Assignment not found."
        )

    changes = payload.model_dump(
        exclude_unset=True
    )

    if "name" in changes and changes["name"] is not None:
        changes["name"] = changes["name"].strip()

    for field, value in changes.items():

        setattr(assignment, field, value)

    db.commit()
    db.refresh(assignment)

    return assignment


# DELETE ASSIGNMENT
@app.delete("/api/assignments/{assignment_id}")
def delete_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.user_id == current_user.id
    ).first()

    if assignment is None:

        raise HTTPException(
            status_code=404,
            detail="Assignment not found."
        )

    db.delete(assignment)
    db.commit()

    return {
        "message": "Assignment deleted successfully."
    }


# ==========================================
# EXAM SCHEDULE
# ==========================================

# GET ALL EXAMS
@app.get(
    "/api/exams",
    response_model=list[ExamOut]
)
def list_exams(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    return db.query(Exam).filter(
        Exam.user_id == current_user.id
    ).order_by(
        Exam.date.asc(),
        Exam.time.asc()
    ).all()


# CREATE EXAM
@app.post(
    "/api/exams",
    response_model=ExamOut,
    status_code=status.HTTP_201_CREATED
)
def create_exam(
    payload: ExamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    exam_id = payload.id or str(uuid4())

    existing = db.query(Exam).filter(
        Exam.id == exam_id
    ).first()

    if existing:

        raise HTTPException(
            status_code=409,
            detail="An exam with this ID already exists."
        )

    exam = Exam(
        id=exam_id,
        user_id=current_user.id,
        subject=payload.subject.strip(),
        date=payload.date,
        time=payload.time,
        venue=payload.venue,
        syllabus=payload.syllabus
    )

    db.add(exam)
    db.commit()
    db.refresh(exam)

    return exam


# UPDATE EXAM
@app.patch(
    "/api/exams/{exam_id}",
    response_model=ExamOut
)
def update_exam(
    exam_id: str,
    payload: ExamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    exam = db.query(Exam).filter(
        Exam.id == exam_id,
        Exam.user_id == current_user.id
    ).first()

    if exam is None:

        raise HTTPException(
            status_code=404,
            detail="Exam not found."
        )

    changes = payload.model_dump(
        exclude_unset=True
    )

    if "subject" in changes and changes["subject"] is not None:
        changes["subject"] = changes["subject"].strip()

    for field, value in changes.items():

        setattr(exam, field, value)

    db.commit()
    db.refresh(exam)

    return exam


# DELETE EXAM
@app.delete("/api/exams/{exam_id}")
def delete_exam(
    exam_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    exam = db.query(Exam).filter(
        Exam.id == exam_id,
        Exam.user_id == current_user.id
    ).first()

    if exam is None:

        raise HTTPException(
            status_code=404,
            detail="Exam not found."
        )

    db.delete(exam)
    db.commit()

    return {
        "message": "Exam deleted successfully."
    }