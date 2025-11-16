from sqlalchemy.orm import Session
from app.models import Medicine
from app.schemas import MedicineCreate, MedicineUpdate
from fastapi import HTTPException
from typing import List, Optional

class MedicineService:
    
    @staticmethod
    def get_all_medicines(db: Session, skip: int = 0, limit: int = 100) -> List[Medicine]:
        """Get all medicines with pagination"""
        return db.query(Medicine).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_medicine_by_id(db: Session, medicine_id: int) -> Optional[Medicine]:
        """Get medicine by ID"""
        return db.query(Medicine).filter(Medicine.medicine_id == medicine_id).first()
    
    @staticmethod
    def get_medicine_by_name(db: Session, medicine_name: str) -> Optional[Medicine]:
        """Get medicine by name"""
        return db.query(Medicine).filter(Medicine.medicine_name == medicine_name).first()
    
    @staticmethod
    def create_medicine(db: Session, medicine_data: MedicineCreate) -> Medicine:
        """Create a new medicine"""
        # Check if medicine name already exists
        existing = db.query(Medicine).filter(
            Medicine.medicine_name == medicine_data.medicine_name
        ).first()
        if existing:
            raise ValueError(f"Medicine with name '{medicine_data.medicine_name}' already exists")
    
        # Use current_stock from schema, default to 0 if not provided
        stock = medicine_data.current_stock if hasattr(medicine_data, 'current_stock') else 0
    
        # Create medicine
        medicine_dict = medicine_data.model_dump(exclude={'current_stock'})
        new_medicine = Medicine(**medicine_dict, current_stock=stock)
        db.add(new_medicine)
        db.commit()
        db.refresh(new_medicine)
    
        return new_medicine

    
    @staticmethod
    def update_medicine(db: Session, medicine_id: int, medicine_data: MedicineUpdate) -> Optional[Medicine]:
        """Update medicine"""
        medicine = db.query(Medicine).filter(Medicine.medicine_id == medicine_id).first()
        if not medicine:
            return None
        
        # Update only provided fields
        update_data = medicine_data.model_dump(exclude_unset=True)
        
        # Check if updating name to existing name
        if "medicine_name" in update_data:
            existing = db.query(Medicine).filter(
                Medicine.medicine_name == update_data["medicine_name"],
                Medicine.medicine_id != medicine_id
            ).first()
            if existing:
                raise ValueError(f"Medicine with name '{update_data['medicine_name']}' already exists")
        
        for key, value in update_data.items():
            setattr(medicine, key, value)
        
        db.commit()
        db.refresh(medicine)
        return medicine
    
    @staticmethod
    def delete_medicine(db: Session, medicine_id: int) -> bool:
        """Delete medicine (cascades to sales, predictions, alerts)"""
        medicine = db.query(Medicine).filter(Medicine.medicine_id == medicine_id).first()
        if not medicine:
            return False
        
        db.delete(medicine)
        db.commit()
        return True
    
    @staticmethod
    def get_medicine_count(db: Session) -> int:
        """Get total count of medicines"""
        return db.query(Medicine).count()
