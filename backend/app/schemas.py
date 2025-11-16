from pydantic import BaseModel, EmailStr
from typing import List, Dict, Optional
from datetime import date, datetime
from decimal import Decimal
from enum import Enum


# ==============================
# USER SCHEMAS
# ==============================

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    access_token: str
    token_type: str = "bearer"

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None


# ==============================
# MEDICINE SCHEMAS
# ==============================

class MedicineCreate(BaseModel):
    medicine_name: str
    batch_no: str
    unit_price: Decimal
    safety_stock: int = 10
    lead_time_days: int = 14
    expiry_date: date
    current_stock: Optional[int] = 0


class MedicineUpdate(BaseModel):
    medicine_name: Optional[str] = None
    batch_no: Optional[str] = None
    unit_price: Optional[Decimal] = None
    safety_stock: Optional[int] = None
    lead_time_days: Optional[int] = None
    expiry_date: Optional[date] = None
    current_stock: Optional[int] = None


# In schemas.py, update MedicineResponse:

class MedicineResponse(BaseModel):
    medicine_id: int
    medicine_name: str
    batch_no: str
    unit_price: Decimal
    safety_stock: int
    lead_time_days: int
    current_stock: int
    last_actual_quantity: Optional[int] = None  # ✅ ADD THIS
    expiry_date: date
    created_at: datetime
    last_updated: datetime

    class Config:
        from_attributes = True


# ==============================
# SALES DATA SCHEMAS
# ==============================

class SalesDataCreate(BaseModel):
    medicine_id: int
    quantity_sold: int
    week_identifier: str
    year: int
    week_number: int


class SalesDataResponse(BaseModel):
    sales_id: int
    medicine_id: int
    quantity_sold: int
    week_identifier: str
    year: int
    week_number: int

    class Config:
        from_attributes = True


# ==============================
# PREDICTION SCHEMAS
# ==============================

class PredictionCreate(BaseModel):
    medicine_id: int
    predicted_demand: int
    reorder_level: int


class PredictionResponse(BaseModel):
    prediction_id: int
    medicine_id: int
    predicted_demand: int
    reorder_level: int
    prediction_date: date

    class Config:
        from_attributes = True


class PredictionSummary(BaseModel):
    Product: str
    Last_Actual_Week: str
    Last_Actual_Quantity: int
    Next_Predicted_Week: str
    Next_Predicted_Quantity: int
    reorder_level: int


class SalesUploadResponse(BaseModel):
    success: bool
    message: str
    summary: Dict


# ==============================
# ALERT SCHEMAS
# ==============================

class AlertTypeEnum(str, Enum):
    low_stock = "low_stock"
    expiry = "expiry"


class AlertCreate(BaseModel):
    medicine_id: int
    alert_type: AlertTypeEnum
    alert_message: str


class AlertResponse(BaseModel):
    alert_id: int
    medicine_id: int
    alert_type: AlertTypeEnum
    alert_message: str
    alert_date: datetime

    class Config:
        from_attributes = True
