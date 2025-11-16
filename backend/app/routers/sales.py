from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
import pandas as pd
import io
from app.database import get_db
from app.models import Medicine, SalesData
from app.schemas import SalesDataResponse, SalesDataCreate
from app.services.prediction import PredictionService
from app.services.alert import AlertService

router = APIRouter(prefix="/api/sales", tags=["Sales Management"])


# ==================== BULK UPLOAD ====================
@router.post("/upload")
async def upload_sales_data(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload sales data CSV or Excel:
    1. Insert/Update weekly sales data
    2. Reduce medicine stock
    3. Store last actual quantity from CSV
    4. Generate predictions
    5. Generate alerts (low stock & expiry)
    """
    if not file.filename.endswith(('.csv', '.xlsx')):
        raise HTTPException(status_code=400, detail="Only CSV or Excel files allowed")

    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents)) if file.filename.endswith('.csv') else pd.read_excel(io.BytesIO(contents))

        required_cols = ['Product_Name', 'Week', 'Year', 'Week_Number', 'Total_Quantity']
        if not all(col in df.columns for col in required_cols):
            raise HTTPException(status_code=400, detail=f"Missing required columns. Required: {', '.join(required_cols)}")

        # Clean and validate numeric columns
        for col in ['Year', 'Week_Number', 'Total_Quantity']:
            df[col] = df[col].astype(str).str.replace(',', '').str.strip()
            df[col] = pd.to_numeric(df[col], errors='coerce')

        if df[['Year', 'Week_Number', 'Total_Quantity']].isnull().any().any():
            raise HTTPException(status_code=400, detail="Invalid numeric values found in file")

        # Group by product and get the last (most recent) quantity for each medicine
        df_sorted = df.sort_values(['Year', 'Week_Number'])
        last_quantities = df_sorted.groupby('Product_Name').agg({
            'Total_Quantity': 'last'
        }).to_dict()['Total_Quantity']

        sales_inserted, stock_updated = 0, 0
        skipped = []

        for _, row in df.iterrows():
            product_name = str(row['Product_Name']).strip()

            # Find medicine
            medicine = db.query(Medicine).filter(Medicine.medicine_name == product_name).first()
            if not medicine:
                skipped.append(product_name)
                continue

            week_identifier = f"{int(row['Year'])}-W{int(row['Week_Number']):02d}"

            # Check if sales data exists
            existing = db.query(SalesData).filter(
                SalesData.medicine_id == medicine.medicine_id,
                SalesData.week_identifier == week_identifier
            ).first()

            if existing:
                existing.quantity_sold = int(row['Total_Quantity'])
            else:
                new_sales = SalesData(
                    medicine_id=medicine.medicine_id,
                    quantity_sold=int(row['Total_Quantity']),
                    week_identifier=week_identifier,
                    year=int(row['Year']),
                    week_number=int(row['Week_Number'])
                )
                db.add(new_sales)
                sales_inserted += 1

            # Update medicine stock
            old_stock = medicine.current_stock or 0
            medicine.current_stock = max(0, old_stock - int(row['Total_Quantity']))
            
            # Store last actual quantity from CSV for this medicine
            medicine.last_actual_quantity = int(last_quantities.get(product_name, row['Total_Quantity']))
            
            stock_updated += 1

        db.commit()

        # Generate predictions
        prediction_service = PredictionService()
        predictions = prediction_service.generate_predictions(df, db)

        # Generate alerts
        alert_service = AlertService()
        alerts_result = alert_service.generate_all_alerts(db)

        return {
            "success": True,
            "message": "Sales data processed successfully",
            "summary": {
                "sales_inserted": sales_inserted,
                "stock_updated": stock_updated,
                "predictions_generated": len(predictions),
                "low_stock_alerts_created": alerts_result['low_stock_alerts'],
                "expiry_alerts_created": alerts_result['expiry_alerts'],
                "total_alerts_created": alerts_result['total_alerts'],
                "skipped_products": skipped
            }
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# ==================== CREATE SINGLE ====================
@router.post("/", response_model=SalesDataResponse)
async def create_sales_record(
    sales_data: SalesDataCreate,
    db: Session = Depends(get_db)
):
    """Manually create a single sales record"""
    medicine = db.query(Medicine).filter(Medicine.medicine_id == sales_data.medicine_id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    week_identifier = f"{sales_data.year}-W{sales_data.week_number:02d}"

    new_sales = SalesData(
        medicine_id=sales_data.medicine_id,
        quantity_sold=sales_data.quantity_sold,
        week_identifier=week_identifier,
        year=sales_data.year,
        week_number=sales_data.week_number
    )
    db.add(new_sales)

    # Reduce stock
    medicine.current_stock = max(0, (medicine.current_stock or 0) - sales_data.quantity_sold)
    db.commit()
    db.refresh(new_sales)

    return new_sales


# ==================== READ ====================
@router.get("/", response_model=List[SalesDataResponse])
async def get_all_sales(
    db: Session = Depends(get_db),
    medicine_id: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    limit: int = Query(100, le=1000)
):
    """Get all sales records"""
    query = db.query(SalesData)
    if medicine_id:
        query = query.filter(SalesData.medicine_id == medicine_id)
    if year:
        query = query.filter(SalesData.year == year)

    sales = query.order_by(desc(SalesData.year), desc(SalesData.week_number)).limit(limit).all()
    return sales


@router.get("/{sales_id}", response_model=SalesDataResponse)
async def get_sales_by_id(sales_id: int, db: Session = Depends(get_db)):
    """Get a sales record by ID"""
    sales = db.query(SalesData).filter(SalesData.sales_id == sales_id).first()
    if not sales:
        raise HTTPException(status_code=404, detail="Sales record not found")
    return sales


@router.get("/medicine/{medicine_id}")
async def get_sales_history_by_medicine(medicine_id: int, db: Session = Depends(get_db)):
    """Get full sales history for a medicine"""
    medicine = db.query(Medicine).filter(Medicine.medicine_id == medicine_id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    sales = db.query(SalesData).filter(
        SalesData.medicine_id == medicine_id
    ).order_by(desc(SalesData.year), desc(SalesData.week_number)).all()

    return {
        "medicine_name": medicine.medicine_name,
        "medicine_id": medicine_id,
        "total_records": len(sales),
        "sales_history": sales
    }


# ==================== UPDATE ====================
@router.put("/{sales_id}", response_model=SalesDataResponse)
async def update_sales_record(
    sales_id: int,
    quantity_sold: int = Query(..., gt=0),
    db: Session = Depends(get_db)
):
    """Update a sales record and adjust stock"""
    sales = db.query(SalesData).filter(SalesData.sales_id == sales_id).first()
    if not sales:
        raise HTTPException(status_code=404, detail="Sales record not found")

    medicine = db.query(Medicine).filter(Medicine.medicine_id == sales.medicine_id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    old_quantity = sales.quantity_sold
    difference = quantity_sold - old_quantity

    sales.quantity_sold = quantity_sold
    medicine.current_stock = max(0, (medicine.current_stock or 0) - difference)

    db.commit()
    db.refresh(sales)
    return sales


# ==================== DELETE ====================
@router.delete("/{sales_id}")
async def delete_sales_record(sales_id: int, db: Session = Depends(get_db)):
    """Delete a sales record and restore stock"""
    sales = db.query(SalesData).filter(SalesData.sales_id == sales_id).first()
    if not sales:
        raise HTTPException(status_code=404, detail="Sales record not found")

    medicine = db.query(Medicine).filter(Medicine.medicine_id == sales.medicine_id).first()
    if medicine:
        medicine.current_stock += sales.quantity_sold

    db.delete(sales)
    db.commit()

    return {"message": "Sales record deleted successfully", "sales_id": sales_id}
