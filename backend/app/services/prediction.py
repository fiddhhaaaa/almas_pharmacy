import pandas as pd
import numpy as np
import os
from xgboost import XGBRegressor
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from keras.models import load_model
from sqlalchemy.orm import Session
from app.models import Medicine, Prediction

class PredictionService:
    def __init__(self, model_dir: str = "./DemandForecast/saved models"):
        self.model_dir = model_dir
        
        # Define which medicines use which model
        self.xgb_medicines = [
            'CLINMISKIN GEL', 
            'DESWIN  TAB', 
            'K GLIM-M 1MG', 
            'MONTEMAC FX TAB'
        ]
        
        self.lstm_medicines = [
            'AJAY SENSITIVE PLUS  --40',
            'AMOCARE CV 625',
            'MEFORNIX-P TAB',
            'MEFTAL-P TAB'
        ]
        
        # All selected medicines
        self.selected_medicines = self.xgb_medicines + self.lstm_medicines
    
    def convert_week_to_datetime(self, series):
        """Convert Week strings like '2024-W31' to datetime (Mon of that ISO week)."""
        return pd.to_datetime(series + '-1', format='%Y-W%W-%w', errors='coerce')
    
    def next_week_label_from_row(self, row):
        """Compute (year, week) for next week given a row with Year, Week_Number."""
        yr = int(row['Year'])
        wk = int(row['Week_Number']) + 1
        if wk > 52:
            wk -= 52
            yr += 1
        return yr, wk, f"{yr}-W{wk:02d}"
    
    def forecast_medicine_next_week_xgb(self, medicine_name: str, df: pd.DataFrame):
        """Generate next week forecast for a single medicine using XGBoost"""
        
        if medicine_name not in df['Product_Name'].unique():
            print(f"⚠️  '{medicine_name}' not found in dataset. Skipping...")
            return None
        
        df_med = df[df['Product_Name'] == medicine_name].copy()
        df_med = df_med.sort_values('Week').reset_index(drop=True)
        
        # Convert Week strings to datetime
        df_med['Week'] = self.convert_week_to_datetime(df_med['Week'])
        
        # Feature Engineering
        df_med['Month'] = np.ceil(df_med['Week_Number'] / 4.33).astype(int).clip(upper=12)
        df_med['Quarter'] = ((df_med['Month'] - 1) // 3 + 1).astype(int)
        df_med['Is_Year_Start'] = (df_med['Week_Number'] <= 4).astype(int)
        df_med['Is_Year_End'] = (df_med['Week_Number'] >= 48).astype(int)
        df_med['Sin_Week'] = np.sin(2 * np.pi * df_med['Week_Number'] / 52)
        df_med['Cos_Week'] = np.cos(2 * np.pi * df_med['Week_Number'] / 52)
        
        # Lag features
        for lag in range(1, 13):
            df_med[f'lag_{lag}'] = df_med['Total_Quantity'].shift(lag)
        
        # Rolling statistics
        df_med['rolling_mean_3'] = df_med['Total_Quantity'].shift(1).rolling(window=3).mean()
        df_med['rolling_mean_5'] = df_med['Total_Quantity'].shift(1).rolling(window=5).mean()
        df_med['rolling_mean_6'] = df_med['Total_Quantity'].shift(1).rolling(window=6).mean()
        df_med['rolling_std_6'] = df_med['Total_Quantity'].shift(1).rolling(window=6).std()
        df_med['rolling_mean_8'] = df_med['Total_Quantity'].shift(1).rolling(window=8).mean()
        df_med['rolling_std_4'] = df_med['Total_Quantity'].shift(1).rolling(window=4).std()
        
        df_med = df_med.dropna().reset_index(drop=True)
        
        if df_med.empty:
            print(f"⚠️ Not enough history for '{medicine_name}'. Skipping...")
            return None
        
        # Load model
        model = XGBRegressor()
        model_path = os.path.join(self.model_dir, f"xgboost_{medicine_name}.json")
        
        try:
            model.load_model(model_path)
            print(f"✅ XGBoost model loaded: {medicine_name}")
        except Exception as e:
            print(f"❌ XGBoost model not found for '{medicine_name}': {e}")
            return None
        
        # Recreate scaler
        feature_cols = [c for c in df_med.columns 
                        if c not in ['Total_Quantity', 'Week', 'Product_Name']]
        X_train = df_med[feature_cols]
        scaler = StandardScaler()
        scaler.fit(X_train)
        
        # Prepare for forecasting
        last_12_quantities = list(df_med['Total_Quantity'].astype(float).values[-12:][::-1])
        last_row = df_med.iloc[-1].copy()
        yr, wk, next_label = self.next_week_label_from_row(last_row)
        
        # Build features
        month = int(np.ceil(wk / 4.33))
        month = min(month, 12)
        quarter = ((month - 1) // 3) + 1
        is_year_start = int(wk <= 4)
        is_year_end = int(wk >= 48)
        sin_week = np.sin(2 * np.pi * wk / 52)
        cos_week = np.cos(2 * np.pi * wk / 52)
        
        # Lag features
        lags = {f'lag_{j}': (last_12_quantities[j-1] if j-1 < len(last_12_quantities) else 0.0) 
                for j in range(1, 13)}
        
        # Rolling statistics helpers
        def safe_mean(arr, k):
            if len(arr) < k:
                return float(np.mean(arr)) if len(arr) > 0 else 0.0
            return float(np.mean(arr[:k]))
        
        def safe_std(arr, k):
            if len(arr) < 2 or k < 2:
                return 0.0
            return float(np.std(arr[:k], ddof=1))
        
        row = {
            'Year': yr,
            'Week_Number': wk,
            'Month': month,
            'Quarter': quarter,
            'Is_Year_Start': is_year_start,
            'Is_Year_End': is_year_end,
            'Sin_Week': sin_week,
            'Cos_Week': cos_week,
            **lags,
            'rolling_mean_3': safe_mean(last_12_quantities, 3),
            'rolling_mean_5': safe_mean(last_12_quantities, 5),
            'rolling_mean_6': safe_mean(last_12_quantities, 6),
            'rolling_std_6': safe_std(last_12_quantities, 6),
            'rolling_mean_8': safe_mean(last_12_quantities, 8),
            'rolling_std_4': safe_std(last_12_quantities, 4)
        }
        
        row_df = pd.DataFrame([row])
        row_df = row_df[feature_cols]
        
        # Predict
        X_input = scaler.transform(row_df)
        pred = model.predict(X_input)[0]
        
        return {
            'Product': medicine_name,
            'Last_Actual_Week': f"{int(last_row['Year'])}-W{int(last_row['Week_Number']):02d}",
            'Last_Actual_Quantity': int(last_row['Total_Quantity']),
            'Next_Predicted_Week': next_label,
            'Next_Predicted_Quantity': int(round(pred)),
            'Model_Type': 'XGBoost'
        }
    
    def forecast_medicine_next_week_lstm(self, medicine_name: str, df: pd.DataFrame):
        """Generate next week forecast for a single medicine using LSTM (time_steps=4)"""
        
        if medicine_name not in df['Product_Name'].unique():
            print(f"⚠️  '{medicine_name}' not found in dataset. Skipping...")
            return None
        
        df_med = df[df['Product_Name'] == medicine_name].copy()
        
        # Aggregate if multiple rows per week exist
        df_med = (df_med
                  .groupby(['Year', 'Week_Number', 'Week'], as_index=False)['Total_Quantity']
                  .sum())
        df_med = df_med.sort_values(['Year', 'Week_Number']).reset_index(drop=True)
        
        # Convert Week to datetime
        df_med['Week_dt'] = self.convert_week_to_datetime(df_med['Week'])
        
        if len(df_med) < 5:
            print(f"⚠️ Not enough history (<5 weeks) for '{medicine_name}'. Skipping...")
            return None
        
        # Prepare scaler on Total_Quantity
        scaler = MinMaxScaler()
        qty = df_med[['Total_Quantity']].values.astype(float)
        scaled = scaler.fit_transform(qty)
        
        # Need last 4 points as input (time_steps=4)
        time_steps = 4
        last_seq = scaled[-time_steps:].reshape(1, time_steps, 1)
        
        # Load LSTM model
        model_path = os.path.join(self.model_dir, f"lstm_{medicine_name}.keras")
        try:
            model = load_model(model_path)
            print(f"✅ LSTM model loaded: {medicine_name}")
        except Exception as e:
            print(f"❌ LSTM model not found for '{medicine_name}': {e}")
            return None
        
        # Predict 1 week ahead
        next_scaled = model.predict(last_seq, verbose=0)[0, 0]
        next_qty = scaler.inverse_transform(np.array([[next_scaled]])).flatten()[0]
        
        # Last actual info
        last_row = df_med.iloc[-1]
        yr, wk, next_label = self.next_week_label_from_row(last_row)
        
        return {
            'Product': medicine_name,
            'Last_Actual_Week': f"{int(last_row['Year'])}-W{int(last_row['Week_Number']):02d}",
            'Last_Actual_Quantity': int(round(float(last_row['Total_Quantity']))),
            'Next_Predicted_Week': next_label,
            'Next_Predicted_Quantity': int(round(float(next_qty))),
            'Model_Type': 'LSTM'
        }
    
    def forecast_medicine_next_week(self, medicine_name: str, df: pd.DataFrame):
        """Route to appropriate model based on medicine name"""
        if medicine_name in self.xgb_medicines:
            return self.forecast_medicine_next_week_xgb(medicine_name, df)
        elif medicine_name in self.lstm_medicines:
            return self.forecast_medicine_next_week_lstm(medicine_name, df)
        else:
            print(f"⚠️ '{medicine_name}' not in XGB or LSTM lists. Skipping...")
            return None
    
    def calculate_reorder_level(self, predicted_demand: int, safety_stock: int, lead_time_days: int) -> int:
        """Calculate reorder level based on predicted demand"""
        # Weekly demand * lead time in weeks + safety stock
        lead_time_weeks = lead_time_days / 7
        reorder_level = int((predicted_demand * lead_time_weeks) + safety_stock)
        return reorder_level
    
    def get_last_actual_quantity(self, df: pd.DataFrame, medicine_name: str) -> int:
        """
        Get the most recent week's Total_Quantity for a specific medicine from CSV
        """
        # Filter for the specific medicine
        medicine_df = df[df['Product_Name'] == medicine_name].copy()
        
        if medicine_df.empty:
            return 0
        
        # Clean Year column (remove commas)
        medicine_df['Year'] = medicine_df['Year'].astype(str).str.replace(',', '').astype(int)
        
        # Sort by Year and Week_Number to get the latest
        medicine_df = medicine_df.sort_values(['Year', 'Week_Number'], ascending=False)
        
        # Return the most recent quantity
        return int(medicine_df.iloc[0]['Total_Quantity'])
    
    def generate_predictions(self, df: pd.DataFrame, db: Session):
        """Generate predictions for all selected medicines and save to DB"""
        all_predictions = []
        
        # Validate required columns
        required_cols = {'Product_Name', 'Week', 'Year', 'Week_Number', 'Total_Quantity'}
        missing = [c for c in required_cols if c not in df.columns]
        if missing:
            raise ValueError(f"Missing required columns in data: {missing}")
        
        print(f"\n🔍 Processing {len(self.selected_medicines)} medicines...")
        
        for medicine_name in self.selected_medicines:
            print(f"\n📄 Processing: {medicine_name}")
            
            prediction_result = self.forecast_medicine_next_week(medicine_name, df)
            
            if prediction_result:
                # Get medicine from DB
                medicine = db.query(Medicine).filter(
                    Medicine.medicine_name == medicine_name
                ).first()
                
                if medicine:
                    predicted_demand = prediction_result['Next_Predicted_Quantity']
                    last_actual_qty = prediction_result['Last_Actual_Quantity']
                    
                    # Calculate reorder level
                    reorder_level = self.calculate_reorder_level(
                        predicted_demand,
                        medicine.safety_stock,
                        medicine.lead_time_days
                    )
                    
                    # ✅ UPDATE: Store last_actual_quantity in Medicine table
                    medicine.last_actual_quantity = last_actual_qty
                    
                    # Save to predictions table
                    prediction = Prediction(
                        medicine_id=medicine.medicine_id,
                        predicted_demand=predicted_demand,
                        reorder_level=reorder_level
                    )
                    db.add(prediction)
                    
                    prediction_result['reorder_level'] = reorder_level
                    all_predictions.append(prediction_result)
                    
                    print(f"   ✅ Prediction: {predicted_demand} units for {prediction_result['Next_Predicted_Week']}")
                    print(f"   📊 Reorder Level: {reorder_level}")
                    print(f"   📈 Last Actual Quantity: {last_actual_qty}")
                else:
                    print(f"   ⚠️ Medicine '{medicine_name}' not found in database")
        
        db.commit()

        print(f"\n✅ Successfully generated {len(all_predictions)} predictions!")
        
        return all_predictions