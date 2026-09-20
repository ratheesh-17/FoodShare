from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Enum, DECIMAL, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class UserRole(str, enum.Enum):
    donor = "donor"
    ngo = "ngo"
    volunteer = "volunteer"
    admin = "admin"


class FoodType(str, enum.Enum):
    cooked = "cooked"
    raw = "raw"
    packaged = "packaged"
    event = "event"


class DonationStatus(str, enum.Enum):
    posted = "posted"
    claimed = "claimed"
    assigned = "assigned"
    completed = "completed"
    expired = "expired"


class VolunteerTaskStatus(str, enum.Enum):
    assigned = "assigned"
    picked_up = "picked_up"
    delivered = "delivered"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    whatsapp_number = Column(String(15), nullable=True)
    address = Column(Text, nullable=True)
    lat = Column(DECIMAL(10, 8), nullable=True)
    lng = Column(DECIMAL(11, 8), nullable=True)
    verified = Column(Boolean, default=False)
    rating = Column(DECIMAL(2, 1), default=5.0)
    telegram_chat_id = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    donations = relationship("Donation", back_populates="donor", foreign_keys="Donation.donor_id")
    claims = relationship("Claim", back_populates="ngo")
    volunteer_tasks = relationship("VolunteerTask", back_populates="volunteer", foreign_keys="VolunteerTask.volunteer_id")
    notifications = relationship("Notification", back_populates="user")


class Donation(Base):
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True)
    donor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    food_name = Column(String(100), nullable=False)
    food_type = Column(Enum(FoodType), nullable=False)
    quantity_kg = Column(DECIMAL(5, 2), nullable=False)
    serves_people = Column(Integer, nullable=False)
    photo_url = Column(String(255), nullable=True)
    address = Column(Text, nullable=False)
    lat = Column(DECIMAL(10, 8), nullable=False)
    lng = Column(DECIMAL(11, 8), nullable=False)
    prepared_at = Column(DateTime, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    status = Column(Enum(DonationStatus), default=DonationStatus.posted)
    created_at = Column(DateTime, server_default=func.now())

    donor = relationship("User", back_populates="donations", foreign_keys=[donor_id])
    claim = relationship("Claim", back_populates="donation", uselist=False)
    volunteer_task = relationship("VolunteerTask", back_populates="donation", uselist=False)


class Claim(Base):
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True, index=True)
    donation_id = Column(Integer, ForeignKey("donations.id"), nullable=False)
    ngo_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    claimed_at = Column(DateTime, server_default=func.now())

    donation = relationship("Donation", back_populates="claim")
    ngo = relationship("User", back_populates="claims")


class VolunteerTask(Base):
    __tablename__ = "volunteer_tasks"

    id = Column(Integer, primary_key=True, index=True)
    donation_id = Column(Integer, ForeignKey("donations.id"), nullable=False)
    volunteer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    fallback_volunteer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(Enum(VolunteerTaskStatus), default=VolunteerTaskStatus.assigned)
    estimated_arrival = Column(DateTime, nullable=True)
    pickup_photo_url = Column(String(255), nullable=True)
    assigned_at = Column(DateTime, server_default=func.now())

    donation = relationship("Donation", back_populates="volunteer_task")
    volunteer = relationship("User", back_populates="volunteer_tasks", foreign_keys=[volunteer_id])


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="notifications")


class DemandLog(Base):
    """Tracks claim activity per area cell for ML demand prediction."""
    __tablename__ = "demand_logs"

    id = Column(Integer, primary_key=True, index=True)
    lat = Column(DECIMAL(10, 8), nullable=False)
    lng = Column(DECIMAL(11, 8), nullable=False)
    claim_count = Column(Integer, default=1)
    logged_at = Column(DateTime, server_default=func.now())
