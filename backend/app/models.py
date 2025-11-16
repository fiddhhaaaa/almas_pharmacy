from sqlalchemy import Column, Integer, String, DECIMAL, Date, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base
import enum   


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column("password", String(255), nullable=False)


class Medicine(Base):
    __tablename__ = "medicines"
    
    medicine_id = Column(Integer, primary_key=True, index=True)
    medicine_name = Column(String(100), nullable=False, unique=True, index=True)
    batch_no = Column(String(100), nullable=False)
    unit_price = Column(DECIMAL(10, 2), nullable=False)
    safety_stock = Column(Integer, nullable=False, default=10)
    lead_time_days = Column(Integer, nullable=False, default=14)
    current_stock = Column(Integer, nullable=False, default=0)
    last_actual_quantity = Column(Integer, nullable=True)# ✅ NEW FIELD
    last_updated = Column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc), 
        nullable=False
    )
    expiry_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    sales_data = relationship("SalesData", back_populates="medicine", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="medicine", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="medicine", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Medicine(id={self.medicine_id}, name={self.medicine_name})>"


class SalesData(Base):
    __tablename__ = "sales_data"
    
    sales_id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.medicine_id", ondelete="CASCADE"), nullable=False)
    quantity_sold = Column(Integer, nullable=False)
    week_identifier = Column(String(10), nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    week_number = Column(Integer, nullable=False)
    
    medicine = relationship("Medicine", back_populates="sales_data")
    
    def __repr__(self):
        return f"<SalesData(medicine_id={self.medicine_id}, week={self.week_identifier}, quantity={self.quantity_sold})>"


class Prediction(Base):
    __tablename__ = "predictions"
    
    prediction_id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.medicine_id", ondelete="CASCADE"), nullable=False, index=True)
    predicted_demand = Column(Integer, nullable=False)
    reorder_level = Column(Integer, nullable=False)
    prediction_date = Column(Date, default=lambda: datetime.now(timezone.utc).date(), nullable=False)
    
    medicine = relationship("Medicine", back_populates="predictions")
    
    def __repr__(self):
        return f"<Prediction(medicine_id={self.medicine_id}, demand={self.predicted_demand}, reorder={self.reorder_level})>"


class AlertType(enum.Enum):
    low_stock = "low_stock"
    expiry = "expiry"


class Alert(Base):
    __tablename__ = "alerts"
    
    alert_id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.medicine_id", ondelete="CASCADE"), nullable=False)
    alert_type = Column(Enum(AlertType), nullable=False)
    alert_message = Column(String(255), nullable=False)
    alert_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    medicine = relationship("Medicine", back_populates="alerts")
    
    def __repr__(self):
        return f"<Alert(medicine_id={self.medicine_id}, type={self.alert_type.value})>"