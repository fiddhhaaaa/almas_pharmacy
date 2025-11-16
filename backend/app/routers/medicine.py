from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas import MedicineCreate, MedicineUpdate, MedicineResponse
from app.services.medicine import MedicineService

router = APIRouter(prefix="/medicines", tags=["Medicines"])


@router.get("/", response_model=List[MedicineResponse])
async def get_all_medicines(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    ✅ Get all medicines with pagination
    """
    medicines = MedicineService.get_all_medicines(db, skip=skip, limit=limit)
    return medicines


@router.get("/{medicine_id}", response_model=MedicineResponse)
async def get_medicine(
    medicine_id: int,
    db: Session = Depends(get_db)
):
    """
    ✅ Get a specific medicine by ID
    """
    medicine = MedicineService.get_medicine_by_id(db, medicine_id)
    if not medicine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine not found")
    return medicine


@router.post("/", response_model=MedicineResponse, status_code=status.HTTP_201_CREATED)
async def create_medicine(
    medicine_data: MedicineCreate,
    db: Session = Depends(get_db)
):
    """
    ✅ Create a new medicine entry
    """
    try:
        medicine = MedicineService.create_medicine(db, medicine_data)
        return medicine
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{medicine_id}", response_model=MedicineResponse)
async def update_medicine(
    medicine_id: int,
    medicine_data: MedicineUpdate,
    db: Session = Depends(get_db)
):
    """
    ✅ Update an existing medicine record
    """
    medicine = MedicineService.update_medicine(db, medicine_id, medicine_data)
    if not medicine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine not found")
    return medicine


@router.delete("/{medicine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_medicine(
    medicine_id: int,
    db: Session = Depends(get_db)
):
    """
    ✅ Delete a medicine from inventory
    """
    success = MedicineService.delete_medicine(db, medicine_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine not found")
    return None
