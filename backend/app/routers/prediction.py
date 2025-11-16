from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_
from typing import List, Optional
from app.database import get_db
from app.models import Medicine, SalesData, Prediction
from app.schemas import PredictionResponse
from app.services.prediction import PredictionService
import pandas as pd
from io import StringIO

# Note: Also update schemas.py to include last_actual_quantity in MedicineResponse

router = APIRouter(prefix="/api/predictions", tags=["Predictions"])


# =========================================
# GET: Latest Predicted Demand Only
# =========================================
@router.get("/", response_model=List[PredictionResponse])
async def get_predicted_demand(
    db: Session = Depends(get_db),
    medicine_id: Optional[int] = Query(None, description="Filter by medicine ID")
):
    """
    ✅ Get ONLY the latest predicted demand values for medicines
    """
    # Subquery to get the latest prediction date for each medicine
    latest_subquery = db.query(
        Prediction.medicine_id,
        func.max(Prediction.prediction_date).label("max_date")
    ).group_by(Prediction.medicine_id)
    
    # Apply medicine filter if provided
    if medicine_id:
        latest_subquery = latest_subquery.filter(Prediction.medicine_id == medicine_id)
    
    latest_subquery = latest_subquery.subquery()

    # Join to get only the latest predictions
    query = db.query(Prediction).join(
        latest_subquery,
        and_(
            Prediction.medicine_id == latest_subquery.c.medicine_id,
            Prediction.prediction_date == latest_subquery.c.max_date
        )
    ).order_by(Prediction.medicine_id)

    predictions = query.all()
    
    if medicine_id and not predictions:
        raise HTTPException(
            status_code=404, 
            detail=f"No predictions found for medicine ID {medicine_id}"
        )
    
    return predictions


@router.get("/summary")
async def get_prediction_summary_dashboard(db: Session = Depends(get_db)):
    """
    Get the latest predictions for all medicines (for dashboard display):
       - Medicine name
       - Predicted demand
       - Reorder level
       - Current stock
       - Last actual quantity
       - Demand trend analysis
    """

    # Step 1: Get latest prediction_date for each medicine
    latest_predictions = db.query(
        Prediction.medicine_id,
        func.max(Prediction.prediction_date).label("max_date")
    ).group_by(Prediction.medicine_id).subquery()

    # Step 2: Join to get latest prediction with medicine info
    query = db.query(
        Medicine.medicine_name,
        Prediction.predicted_demand,
        Prediction.reorder_level,
        Medicine.current_stock,
        Medicine.last_actual_quantity,
        Prediction.prediction_date,
        Prediction.medicine_id
    ).join(
        Prediction, Medicine.medicine_id == Prediction.medicine_id
    ).join(
        latest_predictions,
        and_(
            Prediction.medicine_id == latest_predictions.c.medicine_id,
            Prediction.prediction_date == latest_predictions.c.max_date
        )
    ).distinct().order_by(Medicine.medicine_name)

    results = query.all()

    dashboard_list = []
    seen_medicines = set()

    for med_name, pred_demand, reorder, curr_stock, last_actual, pred_date, med_id in results:
        if med_id in seen_medicines:
            continue
        seen_medicines.add(med_id)

        current = curr_stock or 0
        last = last_actual or 0

        # Stock status
        status = (
            "Out of Stock" if current == 0 else
            "Low Stock" if current <= reorder else
            "Adequate"
        )

        # ---------------------------------------------
        # DEMAND TREND CALCULATION
        # ---------------------------------------------
        if last > 0:
            percentage_change = ((pred_demand - last) / last) * 100
            percentage_change = round(percentage_change, 2)

            if percentage_change > 0:
                trend_summary = (
                    f"The demand for {med_name} is expected to increase by {percentage_change}%."
                )
            elif percentage_change < 0:
                trend_summary = (
                    f"The demand for {med_name} is expected to decrease by {abs(percentage_change)}%."
                )
            else:
                trend_summary = f"The demand for {med_name} is expected to remain stable."
        else:
            trend_summary = f"Insufficient data to calculate demand trend."
            percentage_change = None

        # ---------------------------------------------
        # BUILD DASHBOARD RESPONSE
        # ---------------------------------------------
        dashboard_list.append({
            "medicine_name": med_name,
            "predicted_demand": pred_demand,
            "reorder_level": reorder,
            "current_stock": current,
            "last_actual_quantity": last,
            "stock_status": status,
            "prediction_date": pred_date,
            "percentage_change": percentage_change,
            "demand_trend_summary": trend_summary
        })

    return {
        "total_medicines": len(dashboard_list),
        "predictions": dashboard_list
    }

# =========================================
# GET: Prediction by Medicine (Latest Only) - UPDATED
# =========================================
@router.get("/{medicine_id}")
async def get_prediction_by_medicine(medicine_id: int, db: Session = Depends(get_db)):
    """
    ✅ Get ONLY the latest prediction for a specific medicine
    """
    prediction = db.query(Prediction).filter(
        Prediction.medicine_id == medicine_id
    ).order_by(desc(Prediction.prediction_date)).first()

    if not prediction:
        raise HTTPException(
            status_code=404, 
            detail=f"No prediction found for medicine ID {medicine_id}"
        )

    medicine = db.query(Medicine).filter(
        Medicine.medicine_id == medicine_id
    ).first()

    if not medicine:
        raise HTTPException(
            status_code=404, 
            detail=f"Medicine with ID {medicine_id} not found"
        )

    return {
        "medicine_id": medicine_id,
        "medicine_name": medicine.medicine_name,
        "predicted_demand": prediction.predicted_demand,
        "reorder_level": prediction.reorder_level,
        "prediction_date": prediction.prediction_date,
        "current_stock": medicine.current_stock,
        "last_actual_quantity": medicine.last_actual_quantity  # ✅ ADD THIS
    }


# =========================================
# DELETE: Prediction by Medicine ID
# =========================================
@router.delete("/{medicine_id}", status_code=status.HTTP_200_OK)
async def delete_prediction_by_medicine(medicine_id: int, db: Session = Depends(get_db)):
    """
    ✅ Delete all predictions for a specific medicine by medicine ID
    """
    # Check if medicine exists
    medicine = db.query(Medicine).filter(
        Medicine.medicine_id == medicine_id
    ).first()

    if not medicine:
        raise HTTPException(
            status_code=404, 
            detail=f"Medicine with ID {medicine_id} not found"
        )

    # Get count of predictions to be deleted
    predictions_count = db.query(Prediction).filter(
        Prediction.medicine_id == medicine_id
    ).count()

    if predictions_count == 0:
        raise HTTPException(
            status_code=404, 
            detail=f"No predictions found for medicine ID {medicine_id}"
        )

    # Delete all predictions for this medicine
    db.query(Prediction).filter(
        Prediction.medicine_id == medicine_id
    ).delete()

    db.commit()

    return {
        "message": f"Successfully deleted {predictions_count} prediction(s) for medicine ID {medicine_id}",
        "medicine_id": medicine_id,
        "medicine_name": medicine.medicine_name,
        "deleted_predictions": predictions_count
    }
