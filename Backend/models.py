from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
    String
)

from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def new_id():
    return str(uuid4())


# USER TABLE
class User(Base):

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=new_id
    )

    username: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True
    )

    email: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=True
    )

    password_hash: Mapped[str] = mapped_column(
        String(255)
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    tasks = relationship(
        "Task",
        back_populates="owner",
        cascade="all, delete-orphan"
    )

    assignments = relationship(
        "Assignment",
        back_populates="owner",
        cascade="all, delete-orphan"
    )

    exams = relationship(
        "Exam",
        back_populates="owner",
        cascade="all, delete-orphan"
    )


# DAILY TASKS TABLE
class Task(Base):

    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=new_id
    )

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id"),
        index=True
    )

    name: Mapped[str] = mapped_column(
        String(200)
    )

    date: Mapped[str] = mapped_column(
        String(10)
    )

    completed: Mapped[bool] = mapped_column(
        Boolean,
        default=False
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    completed_dates: Mapped[list] = mapped_column(
        JSON,
        default=list
    )

    owner = relationship(
        "User",
        back_populates="tasks"
    )


# ASSIGNMENTS TABLE
class Assignment(Base):

    __tablename__ = "assignments"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=new_id
    )

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id"),
        index=True
    )

    name: Mapped[str] = mapped_column(
        String(200)
    )

    due_date: Mapped[str] = mapped_column(
        String(10)
    )

    completed: Mapped[bool] = mapped_column(
        Boolean,
        default=False
    )

    owner = relationship(
        "User",
        back_populates="assignments"
    )


# EXAMS TABLE
class Exam(Base):

    __tablename__ = "exams"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=new_id
    )

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id"),
        index=True
    )

    subject: Mapped[str] = mapped_column(
        String(200)
    )

    date: Mapped[str] = mapped_column(
        String(10)
    )

    time: Mapped[str | None] = mapped_column(
        String(10),
        nullable=True
    )

    venue: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    syllabus: Mapped[str | None] = mapped_column(
        String(2000),
        nullable=True
    )

    owner = relationship(
        "User",
        back_populates="exams"
    )