from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from app.models import Alert, AlertType, Medicine, Prediction
from sqlalchemy import func, and_

class AlertService:
    
    @staticmethod
    def check_and_create_low_stock_alerts(db: Session):
        """
        Check all medicines and create low stock alerts
        where current_stock <= reorder_level
        
        FIXED: Deletes old alerts for the same medicine before creating new ones
        """
        
        # Get latest predictions with reorder levels
        latest_predictions = db.query(
            Prediction.medicine_id,
            func.max(Prediction.prediction_date).label('max_date')
        ).group_by(Prediction.medicine_id).subquery()
        
        # Find medicines with low stock (using Medicine.current_stock directly)
        low_stock_medicines = db.query(
            Medicine.medicine_id,
            Medicine.medicine_name,
            Medicine.current_stock,
            Prediction.reorder_level
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
        
        alerts_created = 0
        
        for medicine_id, medicine_name, current_stock, reorder_level in low_stock_medicines:
            # CRITICAL FIX: Delete ALL existing low stock alerts for this medicine
            # (not just today's alerts)
            db.query(Alert).filter(
                Alert.medicine_id == medicine_id,
                Alert.alert_type == AlertType.low_stock
            ).delete(synchronize_session=False)
            
            # Now create the new alert
            alert_message = (
                f"Low stock alert: {medicine_name} "
                f"(Current: {current_stock}, Reorder Level: {reorder_level})"
            )
            
            new_alert = Alert(
                medicine_id=medicine_id,
                alert_type=AlertType.low_stock,
                alert_message=alert_message
            )
            db.add(new_alert)
            alerts_created += 1
        
        db.commit()
        return alerts_created
    

    @staticmethod
    def check_and_create_expiry_alerts(db: Session, days_threshold: int = 30):
        """
        Check medicines expiring within the threshold (default 30 days)
        and create expiry alerts
        
        FIXED: Deletes old alerts for the same medicine before creating new ones
        """
        
        today = datetime.now(timezone.utc).date()
        threshold_date = today + timedelta(days=days_threshold)
        
        # Find medicines expiring soon - ensure we get all of them
        expiring_medicines = db.query(
            Medicine.medicine_id,
            Medicine.medicine_name,
            Medicine.expiry_date
        ).filter(
            Medicine.expiry_date <= threshold_date,
            Medicine.expiry_date >= today
        ).distinct().all()
        
        alerts_created = 0
        
        for medicine_id, medicine_name, expiry_date in expiring_medicines:
            days_until_expiry = (expiry_date - today).days
            
            # CRITICAL FIX: Delete ALL existing expiry alerts for this medicine
            # (not just today's alerts)
            db.query(Alert).filter(
                Alert.medicine_id == medicine_id,
                Alert.alert_type == AlertType.expiry
            ).delete(synchronize_session=False)
            
            # Now create the new alert
            alert_message = (
                f"Expiry alert: {medicine_name} expires in "
                f"{days_until_expiry} days (Expiry: {expiry_date})"
            )
            
            new_alert = Alert(
                medicine_id=medicine_id,
                alert_type=AlertType.expiry,
                alert_message=alert_message
            )
            db.add(new_alert)
            alerts_created += 1
        
        db.commit()
        return alerts_created
    
    
    @staticmethod
    def cleanup_resolved_alerts(db: Session):
        """
        Remove alerts that are no longer valid:
        - Low stock alerts where stock is now above reorder level
        - Expiry alerts for medicines that have expired or are beyond 30 days
        """
        today = datetime.now(timezone.utc).date()
        
        # Get latest predictions
        latest_predictions = db.query(
            Prediction.medicine_id,
            func.max(Prediction.prediction_date).label('max_date')
        ).group_by(Prediction.medicine_id).subquery()
        
        # Find low stock alerts that should be removed (stock is now adequate)
        resolved_low_stock = db.query(Alert.alert_id).join(
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
            Medicine.current_stock > Prediction.reorder_level
        ).all()
        
        # Find expiry alerts that should be removed (expired or > 30 days away)
        resolved_expiry = db.query(Alert.alert_id).join(
            Medicine, Alert.medicine_id == Medicine.medicine_id
        ).filter(
            Alert.alert_type == AlertType.expiry,
            (Medicine.expiry_date < today) | (Medicine.expiry_date > today + timedelta(days=30))
        ).all()
        
        # Delete resolved alerts
        resolved_ids = [aid[0] for aid in resolved_low_stock + resolved_expiry]
        if resolved_ids:
            deleted = db.query(Alert).filter(Alert.alert_id.in_(resolved_ids)).delete(synchronize_session=False)
            db.commit()
            return deleted
        
        return 0

    
    @staticmethod
    def remove_duplicate_alerts(db: Session):
        """
        Remove duplicate alerts, keeping only the most recent one for each medicine+type
        """
        # Get the latest alert for each medicine-type combination
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
        
        # Delete duplicates
        if keep_ids_list:
            deleted = db.query(Alert).filter(
                Alert.alert_id.notin_(keep_ids_list)
            ).delete(synchronize_session=False)
            db.commit()
            return deleted
        
        return 0

    
    @staticmethod
    def generate_all_alerts(db: Session):
        """
        Generate both low stock and expiry alerts
        
        IMPROVED: Now includes cleanup steps to prevent duplicates
        """
        # Step 1: Remove any existing duplicates
        duplicates_removed = AlertService.remove_duplicate_alerts(db)
        
        # Step 2: Generate new alerts (old ones are deleted automatically)
        low_stock_alerts = AlertService.check_and_create_low_stock_alerts(db)
        expiry_alerts = AlertService.check_and_create_expiry_alerts(db)
        
        # Step 3: Clean up resolved alerts
        resolved_removed = AlertService.cleanup_resolved_alerts(db)
        
        # Step 4: Verify all alerts were created correctly
        today = datetime.now(timezone.utc).date()
        threshold_date = today + timedelta(days=30)
        
        # Count medicines that should have expiry alerts
        expected_expiry_medicines = db.query(func.count(Medicine.medicine_id)).filter(
            Medicine.expiry_date <= threshold_date,
            Medicine.expiry_date >= today
        ).scalar()
        
        # Count actual expiry alerts
        actual_expiry_alerts = db.query(func.count(Alert.alert_id)).filter(
            Alert.alert_type == AlertType.expiry
        ).scalar()
        
        return {
            "low_stock_alerts": low_stock_alerts,
            "expiry_alerts": expiry_alerts,
            "total_alerts": low_stock_alerts + expiry_alerts,
            "duplicates_removed": duplicates_removed,
            "resolved_alerts_removed": resolved_removed,
            "verification": {
                "expected_expiry_medicines": expected_expiry_medicines,
                "actual_expiry_alerts": actual_expiry_alerts,
                "all_expiry_alerts_created": expected_expiry_medicines == actual_expiry_alerts
            }
        }