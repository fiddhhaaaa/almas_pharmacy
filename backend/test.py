import pandas as pd
from app.services.prediction import PredictionService
from app.database import SessionLocal
from app.models import Medicine, Prediction

# -------------------------
# 1️⃣ Load CSV
# -------------------------
CSV_FILE = r"C:\Users\fidha\OneDrive\Desktop\demand_prediction_weekly.csv"
# path to your CSV
df = pd.read_csv(CSV_FILE)

# -------------------------
# 2️⃣ Initialize prediction service
# -------------------------
service = PredictionService(model_dir="./DemandForecast/saved models")

# -------------------------
# 3️⃣ Create DB session
# -------------------------
db = SessionLocal()

# -------------------------
# 4️⃣ Generate predictions
# -------------------------
all_predictions = []

for med in service.selected_medicines:
    result = service.forecast_medicine_next_week(med, df)
    if result:
        all_predictions.append(result)
    else:
        print(f"⚠️ Prediction failed for {med} (check model file or CSV/DB names)")

# -------------------------
# 5️⃣ Print results
# -------------------------
if all_predictions:
    print("\nPredictions:")
    df_out = pd.DataFrame(all_predictions)
    print(df_out.to_string(index=False))
else:
    print("❌ No predictions generated.")

# -------------------------
# 6️⃣ Optional: Save to DB
# -------------------------
save_to_db = False  # set True if you want to save Prediction table
if save_to_db and all_predictions:
    for pred in all_predictions:
        medicine = db.query(Medicine).filter(
            Medicine.medicine_name == pred['Product']
        ).first()
        if medicine:
            new_pred = Prediction(
                medicine_id=medicine.medicine_id,
                predicted_demand=pred['Next_Predicted_Quantity'],
                reorder_level=pred.get('reorder_level', 0)
            )
            db.add(new_pred)
    db.commit()
    print("✅ Predictions saved to DB.")

db.close()
