from datetime import date

from pydantic import BaseModel, ConfigDict, Field, field_validator
from datetime import datetime

class APIModel(BaseModel):

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True
    )


# AUTHENTICATION
class RegisterRequest(APIModel):

    username: str = Field(min_length=3, max_length=50)

    email: str | None = Field(
        default=None,
        max_length=255
    )

    password: str = Field(
        min_length=8,
        max_length=128
    )

    @field_validator("username")
    @classmethod
    def clean_username(cls, value):

        value = value.strip()

        if not value:
            raise ValueError("Username cannot be empty")

        return value

    @field_validator("email")
    @classmethod
    def clean_email(cls, value):

        if value and value.strip():
            return value.strip().lower()

        return None


class LoginRequest(APIModel):

    identifier: str = Field(
        min_length=1,
        max_length=255
    )

    password: str = Field(
        min_length=1,
        max_length=128
    )


class UserOut(APIModel):

    id: str
    username: str
    email: str | None
    created_at: str | None = None


class TokenOut(APIModel):

    access_token: str

    token_type: str = "bearer"

    user: UserOut


# DAILY TASKS
class TaskCreate(APIModel):

    id: str | None = Field(
        default=None,
        max_length=64
    )

    name: str = Field(
        min_length=1,
        max_length=200
    )

    date: str = Field(
        default_factory=lambda: date.today().isoformat()
    )

    completed: bool = False

    completed_at: str | None = Field(
        default=None,
        alias="completedAt"
    )

    completed_dates: list[str] = Field(
        default_factory=list,
        alias="completedDates"
    )


class TaskUpdate(APIModel):

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200
    )

    date: str | None = None

    completed: bool | None = None

    completed_at: str | None = Field(
        default=None,
        alias="completedAt"
    )

    completed_dates: list[str] | None = Field(
        default=None,
        alias="completedDates"
    )


class TaskOut(APIModel):

    id: str
    name: str
    date: str
    completed: bool

    completed_at: datetime | None = Field(
    alias="completedAt"
     )

    completed_dates: list[str] = Field(
        alias="completedDates"
    )


# ASSIGNMENTS
class AssignmentCreate(APIModel):

    id: str | None = Field(
        default=None,
        max_length=64
    )

    name: str = Field(
        min_length=1,
        max_length=200
    )

    due_date: str = Field(
        alias="dueDate"
    )

    completed: bool = False


class AssignmentUpdate(APIModel):

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200
    )

    due_date: str | None = Field(
        default=None,
        alias="dueDate"
    )

    completed: bool | None = None


class AssignmentOut(APIModel):

    id: str
    name: str

    due_date: str = Field(
        alias="dueDate"
    )

    completed: bool


# EXAMS
class ExamCreate(APIModel):

    id: str | None = Field(
        default=None,
        max_length=64
    )

    subject: str = Field(
        min_length=1,
        max_length=200
    )

    date: str

    time: str | None = None

    venue: str | None = Field(
        default=None,
        max_length=255
    )

    syllabus: str | None = Field(
        default=None,
        max_length=2000
    )


class ExamUpdate(APIModel):

    subject: str | None = Field(
        default=None,
        min_length=1,
        max_length=200
    )

    date: str | None = None

    time: str | None = None

    venue: str | None = Field(
        default=None,
        max_length=255
    )

    syllabus: str | None = Field(
        default=None,
        max_length=2000
    )


class ExamOut(APIModel):

    id: str
    subject: str
    date: str
    time: str | None
    venue: str | None
    syllabus: str | None