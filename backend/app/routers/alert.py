from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from app.database import get_db
from app.models import Alert, AlertType, Medicine, Prediction
from app.schemas import AlertResponse, AlertCreate
from app.services.alert import AlertService

router = APIRouter(prefix="/api/alerts", tags=["Alerts & Notifications"])


# ==================== CREATE ====================

@router.post("/generate")
async def generate_alerts(db: Session = Depends(get_db)):
    """
    Manually trigger alert generation for:
    - Low stock items
    - Expiring medicines (within 30 days)
    
    FIXED: Removes old alerts before generating new ones to prevent duplicates
    """
    # STEP 1: Clear old alerts (older than 1 day) to prevent accumulation
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=1)
    db.query(Alert).filter(Alert.alert_date < cutoff_date).delete()
    db.commit()
    
    # STEP 2: Generate new alerts
    alert_service = AlertService()
    result = alert_service.generate_all_alerts(db)

    return {
        "success": True,
        "message": "Alerts generated successfully",
        "summary": result
    }


@router.post("/", response_model=AlertResponse)
async def create_alert(alert_data: AlertCreate, db: Session = Depends(get_db)):
    """Create a custom alert manually"""
    medicine = db.query(Medicine).filter(
        Medicine.medicine_id == alert_data.medicine_id
    ).first()

    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    new_alert = Alert(
        medicine_id=alert_data.medicine_id,
        alert_type=alert_data.alert_type,
        alert_message=alert_data.alert_message
    )

    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)

    return new_alert


# ==================== READ ====================

@router.get("/", response_model=List[AlertResponse])
async def get_all_alerts(
    db: Session = Depends(get_db),
    alert_type: Optional[AlertType] = Query(None, description="Filter by alert type"),
    limit: int = Query(100, le=500, description="Limit results")
):
    """
    Return only the LATEST valid alerts (one per medicine per alert type)
    """
    # Get the latest alert for each medicine-type combination
    latest_alerts_subquery = db.query(
        Alert.medicine_id,
        Alert.alert_type,
        func.max(Alert.alert_date).label('max_date')
    ).group_by(Alert.medicine_id, Alert.alert_type).subquery()
    
    query = db.query(Alert).join(
        latest_alerts_subquery,
        and_(
            Alert.medicine_id == latest_alerts_subquery.c.medicine_id,
            Alert.alert_type == latest_alerts_subquery.c.alert_type,
            Alert.alert_date == latest_alerts_subquery.c.max_date
        )
    )
    
    if alert_type:
        query = query.filter(Alert.alert_type == alert_type)

    alerts = query.order_by(desc(Alert.alert_date)).limit(limit).all()
    valid_alerts = []

    for alert in alerts:
        medicine = db.query(Medicine).filter(Medicine.medicine_id == alert.medicine_id).first()
        if not medicine:
            continue

        # LOW STOCK ALERT VALIDATION
        if alert.alert_type == AlertType.low_stock:
            latest_prediction = db.query(Prediction).filter(
                Prediction.medicine_id == medicine.medicine_id
            ).order_by(Prediction.prediction_date.desc()).first()

            if latest_prediction and medicine.current_stock <= latest_prediction.reorder_level:
                valid_alerts.append(alert)
            continue

        # EXPIRY ALERT VALIDATION
        if alert.alert_type == AlertType.expiry:
            today = datetime.now(timezone.utc).date()
            if medicine.expiry_date <= today + timedelta(days=30):
                valid_alerts.append(alert)
            continue

    return valid_alerts


@router.get("/summary")
async def get_alert_summary(db: Session = Depends(get_db)):
    """
    Get real-time alert summary (only LATEST valid alerts, no duplicates)
    """
    today = datetime.now(timezone.utc).date()

    # Get latest predictions
    latest_predictions = db.query(
        Prediction.medicine_id,
        func.max(Prediction.prediction_date).label('max_date')
    ).group_by(Prediction.medicine_id).subquery()

    # Get LATEST alerts per medicine per type
    latest_alerts = db.query(
        Alert.medicine_id,
        Alert.alert_type,
        func.max(Alert.alert_date).label('max_date')
    ).group_by(Alert.medicine_id, Alert.alert_type).subquery()

    # Active low-stock alerts (latest only)
    active_low_stock_query = db.query(Alert).join(
        latest_alerts,
        and_(
            Alert.medicine_id == latest_alerts.c.medicine_id,
            Alert.alert_type == latest_alerts.c.alert_type,
            Alert.alert_date == latest_alerts.c.max_date
        )
    ).join(
        Medicine, Alert.medicine_id == Medicine.medicine_id
    ).join(
        Prediction, Alert.medicine_id == Prediction.medicine_id
    ).join(
        latest_predictions,
        and_(
            Prediction.medicine_id == latest_predictions.c.medicine_id,
            Prediction.prediction_date == latest_predictions.c.max_date
        )
    ).filter(
        Alert.alert_type == AlertType.low_stock,
        Medicine.current_stock <= Prediction.reorder_level
    ).distinct()

    active_low_stock = active_low_stock_query.all()

    # Active expiry alerts (latest only)
    active_expiry_query = db.query(Alert).join(
        latest_alerts,
        and_(
            Alert.medicine_id == latest_alerts.c.medicine_id,
            Alert.alert_type == latest_alerts.c.alert_type,
            Alert.alert_date == latest_alerts.c.max_date
        )
    ).join(
        Medicine, Alert.medicine_id == Medicine.medicine_id
    ).filter(
        Alert.alert_type == AlertType.expiry,
        Medicine.expiry_date >= today,
        Medicine.expiry_date <= today + timedelta(days=30)
    ).distinct()

    active_expiry = active_expiry_query.all()

    # Get recent alerts (combined, no duplicates)
    all_recent = active_low_stock + active_expiry
    # Sort by date and take last 10
    all_recent.sort(key=lambda x: x.alert_date, reverse=True)
    recent_alerts = all_recent[:10]

    return {
        "summary": {
            "total_alerts": len(active_low_stock) + len(active_expiry),
            "low_stock_alerts": len(active_low_stock),
            "expiry_alerts": len(active_expiry),
            "critical_alerts_today": len(active_low_stock)
        },
        "recent_alerts": recent_alerts
    }


@router.get("/low-stock")
async def get_low_stock_medicines(db: Session = Depends(get_db)):
    """
    Get list of medicines with low stock
    (current_stock <= reorder_level)
    No duplicates - uses latest predictions only
    """
    latest_predictions = db.query(
        Prediction.medicine_id,
        func.max(Prediction.prediction_date).label('max_date')
    ).group_by(Prediction.medicine_id).subquery()

    low_stock_items = db.query(
        Medicine.medicine_id,
        Medicine.medicine_name,
        Medicine.batch_no,
        Medicine.current_stock,
        Medicine.safety_stock,
        Prediction.reorder_level,
        Prediction.predicted_demand
    ).join(
        Prediction, Medicine.medicine_id == Prediction.medicine_id
    ).join(
        latest_predictions,
        and_(
            Prediction.medicine_id == latest_predictions.c.medicine_id,
            Prediction.prediction_date == latest_predictions.c.max_date
        )
    ).filter(
        Medicine.current_stock <= Prediction.reorder_level
    ).distinct().all()

    # Use set to prevent duplicates
    seen_medicines = set()
    low_stock_list = []

    for med_id, med_name, batch, current, safety, reorder, demand in low_stock_items:
        # Skip if already processed
        if med_id in seen_medicines:
            continue
        seen_medicines.add(med_id)
        
        if current <= safety:
            severity = "Critical"
        elif current <= (reorder * 0.5):
            severity = "High"
        else:
            severity = "Medium"

        shortage = max(0, reorder - current)
        recommended_order = shortage + demand

        low_stock_list.append({
            "medicine_id": med_id,
            "medicine_name": med_name,
            "batch_no": batch,
            "current_stock": current,
            "safety_stock": safety,
            "reorder_level": reorder,
            "predicted_demand": demand,
            "shortage": shortage,
            "recommended_order_quantity": recommended_order,
            "severity": severity
        })

    return {
        "total_low_stock_items": len(low_stock_list),
        "critical_count": len([x for x in low_stock_list if x['severity'] == 'Critical']),
        "low_stock_medicines": low_stock_list
    }


@router.get("/expiring-soon")
async def get_expiring_medicines(
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365, description="Days threshold for expiry")
):
    """Get list of medicines expiring within given days (default 30) - No duplicates"""
    today = datetime.now(timezone.utc).date()
    threshold_date = today + timedelta(days=days)

    expiring_medicines = db.query(
        Medicine.medicine_id,
        Medicine.medicine_name,
        Medicine.batch_no,
        Medicine.expiry_date,
        Medicine.current_stock
    ).filter(
        Medicine.expiry_date <= threshold_date,
        Medicine.expiry_date >= today
    ).distinct().order_by(Medicine.expiry_date).all()

    # Deduplicate in case of database issues
    seen_medicines = set()
    expiring_list = []
    
    for med_id, med_name, batch, expiry, stock in expiring_medicines:
        if med_id in seen_medicines:
            continue
        seen_medicines.add(med_id)
        
        days_until_expiry = (expiry - today).days
        if days_until_expiry <= 7:
            urgency = "Critical"
        elif days_until_expiry <= 14:
            urgency = "High"
        elif days_until_expiry <= 30:
            urgency = "Medium"
        else:
            urgency = "Low"

        expiring_list.append({
            "medicine_id": med_id,
            "medicine_name": med_name,
            "batch_no": batch,
            "expiry_date": expiry,
            "days_until_expiry": days_until_expiry,
            "current_stock": stock,
            "urgency": urgency
        })

    return {
        "total_expiring_items": len(expiring_list),
        "critical_count": len([x for x in expiring_list if x['urgency'] == 'Critical']),
        "expiring_medicines": expiring_list
    }


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert_by_id(alert_id: int, db: Session = Depends(get_db)):
    """Get a specific alert by ID"""
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


# ==================== DELETE ====================

@router.delete("/{alert_id}")
async def delete_alert(alert_id: int, db: Session = Depends(get_db)):
    """Delete/acknowledge an alert"""
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    db.delete(alert)
    db.commit()

    return {
        "success": True,
        "message": "Alert deleted successfully",
        "alert_id": alert_id
    }


@router.delete("/clear/all")
async def clear_all_alerts(
    db: Session = Depends(get_db),
    alert_type: Optional[AlertType] = Query(None, description="Clear only a specific type")
):
    """Clear all alerts or alerts of a specific type"""
    query = db.query(Alert)
    if alert_type:
        query = query.filter(Alert.alert_type == alert_type)

    deleted_count = query.delete()
    db.commit()

    return {
        "success": True,
        "message": f"Cleared {deleted_count} alert(s)",
        "deleted_count": deleted_count
    }


@router.delete("/clear/old")
async def clear_old_alerts(
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, description="Delete alerts older than this many days")
):
    """Clear alerts older than specified days"""
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
    deleted_count = db.query(Alert).filter(
        Alert.alert_date < cutoff_date
    ).delete()

    db.commit()
    return {
        "success": True,
        "message": f"Cleared {deleted_count} old alert(s)",
        "deleted_count": deleted_count
    }


# ==================== NEW: Clean Up Duplicates ====================

@router.post("/cleanup/duplicates")
async def cleanup_duplicate_alerts(db: Session = Depends(get_db)):
    """
    Remove duplicate alerts, keeping only the latest alert for each medicine+type combination
    """
    # Find latest alert for each medicine-type combination
    latest_alerts = db.query(
        Alert.medicine_id,
        Alert.alert_type,
        func.max(Alert.alert_date).label('max_date')
    ).group_by(Alert.medicine_id, Alert.alert_type).subquery()
    
    # Get IDs of alerts to keep
    keep_ids = db.query(Alert.alert_id).join(
        latest_alerts,
        and_(
            Alert.medicine_id == latest_alerts.c.medicine_id,
            Alert.alert_type == latest_alerts.c.alert_type,
            Alert.alert_date == latest_alerts.c.max_date
        )
    ).all()
    
    keep_ids_list = [aid[0] for aid in keep_ids]
    
    # Delete all alerts not in the keep list
    deleted_count = db.query(Alert).filter(
        Alert.alert_id.notin_(keep_ids_list)
    ).delete(synchronize_session=False)
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Removed {deleted_count} duplicate alerts",
        "deleted_count": deleted_count,
        "remaining_alerts": len(keep_ids_list)
    }