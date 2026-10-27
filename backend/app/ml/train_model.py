import os
import json
from datetime import datetime
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix
)
from app.ml.generate_dataset import generate_synthetic_incident_data
from app.config import settings

def train_and_evaluate_model():
    print("[ResolveAI ML] Generating synthetic training dataset...")
    df = generate_synthetic_incident_data(n_samples=3000, random_state=42)

    features = [
        "category", "priority", "impact", "urgency", "status",
        "hour_of_day", "day_of_week", "technician_workload",
        "reassignment_count", "elapsed_minutes", "remaining_minutes", "consumed_ratio"
    ]
    categorical_features = ["category", "priority", "impact", "urgency", "status"]
    numeric_features = [
        "hour_of_day", "day_of_week", "technician_workload",
        "reassignment_count", "elapsed_minutes", "remaining_minutes", "consumed_ratio"
    ]

    X = df[features]
    y = df["sla_breached"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_features),
            ("num", StandardScaler(), numeric_features)
        ]
    )

    # 1. Baseline Logistic Regression
    lr_pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", LogisticRegression(max_iter=1000, random_state=42))
    ])
    lr_pipeline.fit(X_train, y_train)
    lr_preds = lr_pipeline.predict(X_test)
    lr_f1 = f1_score(y_test, lr_preds)
    print(f"[ResolveAI ML] Baseline Logistic Regression F1-Score: {lr_f1:.4f}")

    # 2. Random Forest Classifier
    rf_pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", RandomForestClassifier(
            n_estimators=120,
            max_depth=12,
            min_samples_split=4,
            random_state=42
        ))
    ])
    rf_pipeline.fit(X_train, y_train)
    rf_preds = rf_pipeline.predict(X_test)
    rf_probs = rf_pipeline.predict_proba(X_test)[:, 1]

    # Evaluation metrics
    acc = float(accuracy_score(y_test, rf_preds))
    prec = float(precision_score(y_test, rf_preds))
    rec = float(recall_score(y_test, rf_preds))
    f1 = float(f1_score(y_test, rf_preds))
    roc_auc = float(roc_auc_score(y_test, rf_probs))
    cm = confusion_matrix(y_test, rf_preds).tolist()

    print(f"[ResolveAI ML] Random Forest Evaluation:")
    print(f"  Accuracy:  {acc:.4f}")
    print(f"  Precision: {prec:.4f}")
    print(f"  Recall:    {rec:.4f}")
    print(f"  F1 Score:  {f1:.4f}")
    print(f"  ROC-AUC:   {roc_auc:.4f}")

    # Extract feature importances
    classifier = rf_pipeline.named_steps["classifier"]
    encoded_cat_names = rf_pipeline.named_steps["preprocessor"].named_transformers_["cat"].get_feature_names_out(categorical_features)
    all_feature_names = list(encoded_cat_names) + numeric_features
    importances = classifier.feature_importances_
    
    feature_importance_dict = {
        name: round(float(imp), 4)
        for name, imp in sorted(zip(all_feature_names, importances), key=lambda x: x[1], reverse=True)[:15]
    }

    # Prepare model artifact directory
    os.makedirs(os.path.dirname(settings.ML_MODEL_PATH), exist_ok=True)
    
    # Save model pipeline
    joblib.dump(rf_pipeline, settings.ML_MODEL_PATH)
    print(f"[ResolveAI ML] Model saved to: {settings.ML_MODEL_PATH}")

    # Save metrics JSON
    metrics_data = {
        "model_type": "Random Forest Classifier (Ensemble)",
        "baseline_comparison": {
            "logistic_regression_f1": round(float(lr_f1), 4),
            "random_forest_f1": round(f1, 4)
        },
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "confusion_matrix": cm,
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "trained_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
        "feature_importances": feature_importance_dict
    }

    with open(settings.ML_METRICS_PATH, "w") as f:
        json.dump(metrics_data, f, indent=2)
    print(f"[ResolveAI ML] Metrics saved to: {settings.ML_METRICS_PATH}")

    return metrics_data

if __name__ == "__main__":
    train_and_evaluate_model()
