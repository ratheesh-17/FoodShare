"""
Food Spoilage Risk Classifier — Training Script
================================================
Dataset: Synthetic dataset based on USDA Food Safety guidelines
         (https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation)

Features:
  - food_type_encoded   : 0=packaged, 1=raw, 2=cooked
  - hours_since_prepared: hours elapsed since food was prepared
  - hours_until_expiry  : hours remaining before stated expiry
  - quantity_kg         : amount of food in kg
  - season              : 0=winter, 1=spring, 2=summer, 3=autumn
  - is_peak_hour        : 1 if posted between 12pm–3pm or 7pm–10pm (high demand)

Target:
  - spoilage_risk: 0=safe, 1=at_risk, 2=critical

USDA Rules encoded in dataset generation:
  - Cooked food: safe < 2h, at_risk 2–4h, critical > 4h at room temp
  - Raw food:    safe < 4h, at_risk 4–8h, critical > 8h
  - Packaged:    safe < 24h, at_risk 24–48h, critical > 48h
  - Summer adds +30% risk (higher ambient temperature)
  - Large quantities (>20kg) spoil faster due to uneven cooling
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os

np.random.seed(42)
N = 8000  # dataset size

# ─── Generate synthetic dataset ───────────────────────────────────────────────

food_types = np.random.choice([0, 1, 2], size=N, p=[0.25, 0.30, 0.45])  # packaged, raw, cooked
seasons    = np.random.choice([0, 1, 2, 3], size=N)                       # winter, spring, summer, autumn
is_peak    = np.random.choice([0, 1], size=N, p=[0.6, 0.4])

# Hours since prepared — cooked food prepared more recently
hours_since = np.where(
    food_types == 2, np.random.exponential(3, N),    # cooked: avg 3h
    np.where(food_types == 1, np.random.exponential(6, N),  # raw: avg 6h
             np.random.exponential(20, N))            # packaged: avg 20h
)
hours_since = np.clip(hours_since, 0.1, 72)

# Hours until expiry — inversely related to hours_since
hours_until = np.where(
    food_types == 2, np.maximum(0.1, np.random.normal(4, 2, N) - hours_since * 0.3),
    np.where(food_types == 1, np.maximum(0.1, np.random.normal(10, 4, N) - hours_since * 0.2),
             np.maximum(0.1, np.random.normal(36, 12, N) - hours_since * 0.1))
)

quantity_kg = np.random.exponential(8, N)
quantity_kg = np.clip(quantity_kg, 0.5, 100)

# ─── Label generation based on USDA rules ─────────────────────────────────────

def assign_label(ft, hs, hu, qty, season, peak):
    """
    ft: food_type (0=packaged, 1=raw, 2=cooked)
    hs: hours_since_prepared
    hu: hours_until_expiry
    qty: quantity_kg
    season: 0-3
    peak: 0/1
    """
    # Base thresholds from USDA
    if ft == 2:    # cooked
        safe_limit = 2.0
        risk_limit = 4.0
    elif ft == 1:  # raw
        safe_limit = 4.0
        risk_limit = 8.0
    else:          # packaged
        safe_limit = 24.0
        risk_limit = 48.0

    # Summer penalty (+30% faster spoilage)
    if season == 2:
        safe_limit *= 0.7
        risk_limit *= 0.7

    # Large quantity penalty (>20kg harder to keep safe)
    if qty > 20:
        safe_limit *= 0.85
        risk_limit *= 0.85

    # Primary decision: hours since prepared
    if hs < safe_limit and hu > safe_limit:
        base = 0  # safe
    elif hs < risk_limit and hu > 1.0:
        base = 1  # at_risk
    else:
        base = 2  # critical

    # If expiry is very soon, bump up risk
    if hu < 1.0 and base < 2:
        base = min(base + 1, 2)

    # Add small noise (5% label flip for realism)
    if np.random.random() < 0.05:
        base = np.random.choice([0, 1, 2])

    return base

labels = np.array([
    assign_label(food_types[i], hours_since[i], hours_until[i],
                 quantity_kg[i], seasons[i], is_peak[i])
    for i in range(N)
])

# ─── Build DataFrame ──────────────────────────────────────────────────────────

df = pd.DataFrame({
    "food_type_encoded":    food_types,
    "hours_since_prepared": hours_since,
    "hours_until_expiry":   hours_until,
    "quantity_kg":          quantity_kg,
    "season":               seasons,
    "is_peak_hour":         is_peak,
    "spoilage_risk":        labels,
})

print(f"Dataset shape: {df.shape}")
print(f"Label distribution:\n{df['spoilage_risk'].value_counts().sort_index()}")
print(f"  0=safe: {(labels==0).sum()}  1=at_risk: {(labels==1).sum()}  2=critical: {(labels==2).sum()}")

# ─── Train / Test split ───────────────────────────────────────────────────────

X = df.drop("spoilage_risk", axis=1)
y = df["spoilage_risk"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# ─── Scale features ───────────────────────────────────────────────────────────

scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s  = scaler.transform(X_test)

# ─── Train Gradient Boosting Classifier ──────────────────────────────────────
# Using GradientBoosting (sklearn) — no extra install needed beyond scikit-learn

model = GradientBoostingClassifier(
    n_estimators=200,
    learning_rate=0.1,
    max_depth=4,
    min_samples_split=10,
    subsample=0.8,
    random_state=42,
)

print("\nTraining Gradient Boosting Classifier...")
model.fit(X_train_s, y_train)

# ─── Evaluate ─────────────────────────────────────────────────────────────────

y_pred = model.predict(X_test_s)
acc    = accuracy_score(y_test, y_pred)

print(f"\nAccuracy: {acc:.4f} ({acc*100:.2f}%)")
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=["safe", "at_risk", "critical"]))

# Feature importance
feat_imp = sorted(zip(X.columns, model.feature_importances_), key=lambda x: x[1], reverse=True)
print("Feature Importances:")
for feat, imp in feat_imp:
    print(f"  {feat:25s}: {imp:.4f}")

# ─── Save model ───────────────────────────────────────────────────────────────

save_dir = os.path.dirname(os.path.abspath(__file__))
joblib.dump(model,  os.path.join(save_dir, "spoilage_model.pkl"))
joblib.dump(scaler, os.path.join(save_dir, "spoilage_scaler.pkl"))
joblib.dump(list(X.columns), os.path.join(save_dir, "spoilage_features.pkl"))

print(f"\nModel saved -> spoilage_model.pkl")
print(f"Scaler saved -> spoilage_scaler.pkl")
print(f"Features saved -> spoilage_features.pkl")
print("\nRun this script once before starting the backend server.")
