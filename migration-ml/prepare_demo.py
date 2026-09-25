import os
import sys
import time
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

from sklearn.model_selection import GroupShuffleSplit
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, f1_score, precision_score, recall_score, confusion_matrix

# Set random seed for reproducibility
RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)

# Setup directory paths
BASE_DIR = r"D:\Sahay\migration-ml"
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
FIGURES_DIR = os.path.join(OUTPUT_DIR, "figures")
METRICS_DIR = os.path.join(OUTPUT_DIR, "metrics")
PROCESSED_DIR = os.path.join(OUTPUT_DIR, "processed_data")
MODELS_DIR = os.path.join(BASE_DIR, "models")

for folder in [DATA_DIR, FIGURES_DIR, METRICS_DIR, PROCESSED_DIR, MODELS_DIR]:
    os.makedirs(folder, exist_ok=True)

excel_path = r"D:\Sahay\backend\DS-2400-D03-MDDS.XLSX"

print("==================================================", flush=True)
print("   GUJARAT CENSUS 2011 - MIGRATION ML PIPELINE    ", flush=True)
print("==================================================", flush=True)

# [1/7] Loading dataset...
print("\n[1/7] Loading dataset...", flush=True)
t0 = time.time()
df_raw = pd.read_excel(excel_path, skiprows=5, header=None, engine='calamine')
print(f"      Loaded raw Excel dataset in {time.time()-t0:.2f} seconds.", flush=True)
print(f"      Raw Dataset Shape: {df_raw.shape[0]} rows x {df_raw.shape[1]} columns", flush=True)

cols = [
    'Table_Name', 'State_Code', 'District_Code', 'Area_Name',
    'Enum_Rural_Urban', 'Duration_Of_Residence', 'Last_Residence_Type', 'Last_Res_Rural_Urban',
    'Total_Persons', 'Total_Males', 'Total_Females',
    'Work_Persons', 'Work_Males', 'Work_Females',
    'Business_Persons', 'Business_Males', 'Business_Females',
    'Edu_Persons', 'Edu_Males', 'Edu_Females',
    'Marriage_Persons', 'Marriage_Males', 'Marriage_Females',
    'Birth_Persons', 'Birth_Males', 'Birth_Females',
    'HH_Persons', 'HH_Males', 'HH_Females',
    'Other_Persons', 'Other_Males', 'Other_Females'
]
df_raw.columns = cols

# Clean non-data footer/header rows
df = df_raw.dropna(subset=['Area_Name']).copy()

# Ensure count columns are numeric
count_cols = [
    'Total_Persons', 'Total_Males', 'Total_Females',
    'Work_Persons', 'Work_Males', 'Work_Females',
    'Business_Persons', 'Business_Males', 'Business_Females',
    'Edu_Persons', 'Edu_Males', 'Edu_Females',
    'Marriage_Persons', 'Marriage_Males', 'Marriage_Females',
    'Birth_Persons', 'Birth_Males', 'Birth_Females',
    'HH_Persons', 'HH_Males', 'HH_Females',
    'Other_Persons', 'Other_Males', 'Other_Females'
]
for col in count_cols:
    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

# [2/7] Cleaning dataset...
print("\n[2/7] Cleaning dataset...", flush=True)
print("      Filtering macro-aggregates (State totals, 'All durations', broad summary origins)...", flush=True)

macro_last_res_totals = [
    'Total', 
    'Last residence within India', 
    'Within the state of enumeration but outside the place of enumeration',
    'Last residence outside India'
]

df_clean = df[
    (df['Area_Name'] != 'State - GUJARAT') &
    (df['Duration_Of_Residence'] != 'All durations of residence') &
    (df['Enum_Rural_Urban'].isin(['Rural', 'Urban'])) &
    (df['Last_Res_Rural_Urban'].isin(['Rural', 'Urban'])) &
    (~df['Last_Residence_Type'].isin(macro_last_res_totals)) &
    (df['Total_Persons'] > 0)
].copy()

print(f"      Clean Usable Rows Remaining: {len(df_clean)} rows (from {len(df_raw)} raw rows)", flush=True)

# Save cleaned granular dataset
df_clean.to_csv(os.path.join(PROCESSED_DIR, "cleaned_granular_migration.csv"), index=False)

# [3/7] Feature Engineering & Target Construction...
print("\n[3/7] Creating features & targets...", flush=True)

# --- TASK 1 TARGET: Purpose of Migration ---
reason_cols = {
    'Work/employment': 'Work_Persons',
    'Business': 'Business_Persons',
    'Education': 'Edu_Persons',
    'Marriage': 'Marriage_Persons',
    'Moved after birth': 'Birth_Persons',
    'Moved with household': 'HH_Persons',
    'Others': 'Other_Persons'
}
reason_counts_df = pd.DataFrame({p: df_clean[col] for p, col in reason_cols.items()})
df_clean['Dominant_Purpose'] = reason_counts_df.idxmax(axis=1)

print("      [Task 1 Target] Dominant_Purpose Distribution:", flush=True)
purpose_dist = df_clean['Dominant_Purpose'].value_counts()
for purpose, count in purpose_dist.items():
    print(f"        * {purpose:<22}: {count:>5} rows ({count/len(df_clean)*100:.1f}%)", flush=True)

# --- TASK 2 TARGET: Kind/Type of Migration (Migration Flow) ---
df_clean['Migration_Flow'] = df_clean['Last_Res_Rural_Urban'] + " -> " + df_clean['Enum_Rural_Urban']

print("      [Task 2 Target] Migration_Flow Distribution:", flush=True)
flow_dist = df_clean['Migration_Flow'].value_counts()
for flow, count in flow_dist.items():
    print(f"        * {flow:<22}: {count:>5} rows ({count/len(df_clean)*100:.1f}%)", flush=True)

# Common Engineered Features
df_clean['Sex_Ratio'] = np.where(df_clean['Total_Persons'] > 0, df_clean['Total_Males'] / df_clean['Total_Persons'], 0.5)
df_clean['Male_Proportion'] = df_clean['Sex_Ratio']
df_clean['Female_Proportion'] = 1.0 - df_clean['Sex_Ratio']

def get_origin_scope(row):
    last_res = str(row['Last_Residence_Type'])
    if 'district' in last_res.lower():
        return 'Intra-State (Same/Other District)'
    elif last_res in ['Countries in Asia beyond India', 'Other Countries']:
        return 'International'
    else:
        return 'Inter-State'

df_clean['Origin_Scope'] = df_clean.apply(get_origin_scope, axis=1)

# Task 1 Feature Set (Includes origin & destination rural/urban types as predictors)
task1_cat_cols = ['Area_Name', 'Enum_Rural_Urban', 'Duration_Of_Residence', 'Last_Residence_Type', 'Last_Res_Rural_Urban', 'Origin_Scope']
task1_num_cols = ['Male_Proportion', 'Total_Persons']

# Task 2 Feature Set (LEAKAGE FREE: Excludes Enum_Rural_Urban and Last_Res_Rural_Urban)
task2_cat_cols = ['Area_Name', 'Duration_Of_Residence', 'Last_Residence_Type', 'Origin_Scope']
task2_num_cols = ['Male_Proportion', 'Total_Persons']

# Plot Target Distributions
plt.figure(figsize=(10, 5))
sns.countplot(data=df_clean, y='Dominant_Purpose', order=df_clean['Dominant_Purpose'].value_counts().index, hue='Dominant_Purpose', legend=False, palette='viridis')
plt.title('Task 1: Migration Purpose Distribution (Gujarat Census 2011)', fontsize=14, fontweight='bold', pad=15)
plt.xlabel('Number of Demographic Stream Records', fontsize=12)
plt.ylabel('Migration Purpose', fontsize=12)
plt.grid(axis='x', linestyle='--', alpha=0.7)
plt.tight_layout()
plt.savefig(os.path.join(FIGURES_DIR, 'purpose_distribution.png'), dpi=300)
plt.close()

plt.figure(figsize=(10, 5))
sns.countplot(data=df_clean, y='Migration_Flow', order=df_clean['Migration_Flow'].value_counts().index, hue='Migration_Flow', legend=False, palette='magma')
plt.title('Task 2: Migration Flow Distribution (Gujarat Census 2011)', fontsize=14, fontweight='bold', pad=15)
plt.xlabel('Number of Demographic Stream Records', fontsize=12)
plt.ylabel('Migration Flow Category', fontsize=12)
plt.grid(axis='x', linestyle='--', alpha=0.7)
plt.tight_layout()
plt.savefig(os.path.join(FIGURES_DIR, 'flow_distribution.png'), dpi=300)
plt.close()

# [4/7] District Group Train/Test Split...
print("\n[4/7] Splitting train/test data by District Group...", flush=True)
groups = df_clean['Area_Name'].copy()
gss = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=RANDOM_STATE)
train_idx, test_idx = next(gss.split(df_clean, groups=groups))

df_train = df_clean.iloc[train_idx].copy()
df_test = df_clean.iloc[test_idx].copy()

train_districts = df_train['Area_Name'].nunique()
test_districts = df_test['Area_Name'].nunique()

print(f"      Training Records : {len(df_train)} rows across {train_districts} districts", flush=True)
print(f"      Testing Records  : {len(df_test)} rows across {test_districts} unseen districts", flush=True)

overlap = set(df_train['Area_Name']).intersection(set(df_test['Area_Name']))
assert len(overlap) == 0, "Error: District overlap detected between train and test sets!"
print("      Spatial Leakage Check: Verified 0 district overlap between Train and Test sets.", flush=True)

# Prepare Task 1 Datasets
X1_train = df_train[task1_cat_cols + task1_num_cols]
y1_train = df_train['Dominant_Purpose']
X1_test = df_test[task1_cat_cols + task1_num_cols]
y1_test = df_test['Dominant_Purpose']

# Prepare Task 2 Datasets
X2_train = df_train[task2_cat_cols + task2_num_cols]
y2_train = df_train['Migration_Flow']
X2_test = df_test[task2_cat_cols + task2_num_cols]
y2_test = df_test['Migration_Flow']

# [5/7] Training Models (Task 1 & Task 2)...
print("\n[5/7] Training Baseline & Random Forest Models...", flush=True)

# Preprocessor for Task 1
prep1 = ColumnTransformer([
    ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), task1_cat_cols),
    ('num', StandardScaler(), task1_num_cols)
])
X1_train_prep = prep1.fit_transform(X1_train)
X1_test_prep = prep1.transform(X1_test)

# Preprocessor for Task 2
prep2 = ColumnTransformer([
    ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), task2_cat_cols),
    ('num', StandardScaler(), task2_num_cols)
])
X2_train_prep = prep2.fit_transform(X2_train)
X2_test_prep = prep2.transform(X2_test)

# Task 1 Models
dummy1 = DummyClassifier(strategy='most_frequent')
dummy1.fit(X1_train_prep, y1_train)

logreg1 = LogisticRegression(max_iter=1000, class_weight='balanced', random_state=RANDOM_STATE)
logreg1.fit(X1_train_prep, y1_train)

rf1 = RandomForestClassifier(n_estimators=150, max_depth=12, min_samples_split=4, random_state=RANDOM_STATE, class_weight='balanced', n_jobs=-1)
rf1.fit(X1_train_prep, y1_train)

# Task 2 Models
dummy2 = DummyClassifier(strategy='most_frequent')
dummy2.fit(X2_train_prep, y2_train)

logreg2 = LogisticRegression(max_iter=1000, class_weight='balanced', random_state=RANDOM_STATE)
logreg2.fit(X2_train_prep, y2_train)

rf2 = RandomForestClassifier(n_estimators=150, max_depth=12, min_samples_split=4, random_state=RANDOM_STATE, class_weight='balanced', n_jobs=-1)
rf2.fit(X2_train_prep, y2_train)

print("      All models (Dummy, Logistic Regression, Random Forest) trained successfully.", flush=True)

# [6/7] Evaluating Models...
print("\n[6/7] Evaluating Models & Generating Visualizations...", flush=True)

def eval_model(model, X_test_p, y_test_p):
    preds = model.predict(X_test_p)
    acc = accuracy_score(y_test_p, preds)
    macro_f1 = f1_score(y_test_p, preds, average='macro', zero_division=0)
    weighted_f1 = f1_score(y_test_p, preds, average='weighted', zero_division=0)
    prec_macro = precision_score(y_test_p, preds, average='macro', zero_division=0)
    rec_macro = recall_score(y_test_p, preds, average='macro', zero_division=0)
    return preds, acc, macro_f1, weighted_f1, prec_macro, rec_macro

# Evaluate Task 1
preds1_dummy, acc1_d, mf1_1_d, wf1_1_d, _, _ = eval_model(dummy1, X1_test_prep, y1_test)
preds1_lr, acc1_lr, mf1_1_lr, wf1_1_lr, _, _ = eval_model(logreg1, X1_test_prep, y1_test)
preds1_rf, acc1_rf, mf1_1_rf, wf1_1_rf, prec1_rf, rec1_rf = eval_model(rf1, X1_test_prep, y1_test)

# Evaluate Task 2
preds2_dummy, acc2_d, mf1_2_d, wf1_2_d, _, _ = eval_model(dummy2, X2_test_prep, y2_test)
preds2_lr, acc2_lr, mf1_2_lr, wf1_2_lr, _, _ = eval_model(logreg2, X2_test_prep, y2_test)
preds2_rf, acc2_rf, mf1_2_rf, wf1_2_rf, prec2_rf, rec2_rf = eval_model(rf2, X2_test_prep, y2_test)

print("\n=================== TASK 1: PURPOSE PREDICTION METRICS ===================")
print(f" Dummy Baseline      : Accuracy = {acc1_d:.4f} | Macro F1 = {mf1_1_d:.4f} | Weighted F1 = {wf1_1_d:.4f}")
print(f" Logistic Regression : Accuracy = {acc1_lr:.4f} | Macro F1 = {mf1_1_lr:.4f} | Weighted F1 = {wf1_1_lr:.4f}")
print(f" Random Forest       : Accuracy = {acc1_rf:.4f} | Macro F1 = {mf1_1_rf:.4f} | Weighted F1 = {wf1_1_rf:.4f}")
print("==========================================================================")

print("\n================= TASK 2: MIGRATION FLOW METRICS =========================")
print(f" Dummy Baseline      : Accuracy = {acc2_d:.4f} | Macro F1 = {mf1_2_d:.4f} | Weighted F1 = {wf1_2_d:.4f}")
print(f" Logistic Regression : Accuracy = {acc2_lr:.4f} | Macro F1 = {mf1_2_lr:.4f} | Weighted F1 = {wf1_2_lr:.4f}")
print(f" Random Forest       : Accuracy = {acc2_rf:.4f} | Macro F1 = {mf1_2_rf:.4f} | Weighted F1 = {wf1_2_rf:.4f}")
print("==========================================================================")

print("\n--- Detailed Classification Report: Task 1 (Random Forest) ---")
print(classification_report(y1_test, preds1_rf, zero_division=0))

print("\n--- Detailed Classification Report: Task 2 (Random Forest) ---")
print(classification_report(y2_test, preds2_rf, zero_division=0))

# Save Consolidated Metrics CSV
all_metrics = [
    {'Task': 'Task 1 - Purpose', 'Model': 'Dummy Baseline', 'Accuracy': round(acc1_d, 4), 'Macro_F1': round(mf1_1_d, 4), 'Weighted_F1': round(wf1_1_d, 4)},
    {'Task': 'Task 1 - Purpose', 'Model': 'Logistic Regression', 'Accuracy': round(acc1_lr, 4), 'Macro_F1': round(mf1_1_lr, 4), 'Weighted_F1': round(wf1_1_lr, 4)},
    {'Task': 'Task 1 - Purpose', 'Model': 'Random Forest', 'Accuracy': round(acc1_rf, 4), 'Macro_F1': round(mf1_1_rf, 4), 'Weighted_F1': round(wf1_1_rf, 4)},
    {'Task': 'Task 2 - Flow', 'Model': 'Dummy Baseline', 'Accuracy': round(acc2_d, 4), 'Macro_F1': round(mf1_2_d, 4), 'Weighted_F1': round(wf1_2_d, 4)},
    {'Task': 'Task 2 - Flow', 'Model': 'Logistic Regression', 'Accuracy': round(acc2_lr, 4), 'Macro_F1': round(mf1_2_lr, 4), 'Weighted_F1': round(wf1_2_lr, 4)},
    {'Task': 'Task 2 - Flow', 'Model': 'Random Forest', 'Accuracy': round(acc2_rf, 4), 'Macro_F1': round(mf1_2_rf, 4), 'Weighted_F1': round(wf1_2_rf, 4)},
]
pd.DataFrame(all_metrics).to_csv(os.path.join(METRICS_DIR, 'demo_metrics.csv'), index=False)

# Save Confusion Matrix - Task 1
cm1 = confusion_matrix(y1_test, preds1_rf, labels=rf1.classes_)
plt.figure(figsize=(10, 8))
sns.heatmap(cm1, annot=True, fmt='d', cmap='Blues', xticklabels=rf1.classes_, yticklabels=rf1.classes_)
plt.title('Confusion Matrix - Purpose Prediction (Random Forest)', fontsize=14, fontweight='bold', pad=15)
plt.xlabel('Predicted Purpose', fontsize=12)
plt.ylabel('Actual Purpose', fontsize=12)
plt.xticks(rotation=45, ha='right')
plt.tight_layout()
plt.savefig(os.path.join(FIGURES_DIR, 'confusion_matrix.png'), dpi=300)
plt.close()

# Save Confusion Matrix - Task 2
cm2 = confusion_matrix(y2_test, preds2_rf, labels=rf2.classes_)
plt.figure(figsize=(8, 6))
sns.heatmap(cm2, annot=True, fmt='d', cmap='Purples', xticklabels=rf2.classes_, yticklabels=rf2.classes_)
plt.title('Confusion Matrix - Migration Flow Prediction (Random Forest)', fontsize=14, fontweight='bold', pad=15)
plt.xlabel('Predicted Flow', fontsize=12)
plt.ylabel('Actual Flow', fontsize=12)
plt.xticks(rotation=30, ha='right')
plt.tight_layout()
plt.savefig(os.path.join(FIGURES_DIR, 'confusion_matrix_flow.png'), dpi=300)
plt.close()

# Save Feature Importances
def plot_feature_importance(model, preprocessor, cat_cols, num_cols, title, filename, color):
    cat_encoder = preprocessor.named_transformers_['cat']
    encoded_cat_names = list(cat_encoder.get_feature_names_out(cat_cols))
    all_names = encoded_cat_names + num_cols
    importances = model.feature_importances_
    top_idx = np.argsort(importances)[-15:]
    plt.figure(figsize=(10, 6))
    plt.barh(range(len(top_idx)), importances[top_idx], align='center', color=color)
    plt.yticks(range(len(top_idx)), [all_names[i] for i in top_idx])
    plt.xlabel('Relative Feature Importance')
    plt.title(title, fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.savefig(os.path.join(FIGURES_DIR, filename), dpi=300)
    plt.close()

plot_feature_importance(rf1, prep1, task1_cat_cols, task1_num_cols, 'Top Feature Importances - Task 1: Migration Purpose', 'feature_importance.png', 'teal')
plot_feature_importance(rf2, prep2, task2_cat_cols, task2_num_cols, 'Top Feature Importances - Task 2: Migration Flow', 'feature_importance_flow.png', 'indigo')

# Save Model Artifacts
joblib.dump({
    'preprocessor': prep1,
    'model': rf1,
    'classes': rf1.classes_,
    'feature_cols_cat': task1_cat_cols,
    'feature_cols_num': task1_num_cols
}, os.path.join(MODELS_DIR, 'rf_purpose_model.pkl'))

joblib.dump({
    'preprocessor': prep2,
    'model': rf2,
    'classes': rf2.classes_,
    'feature_cols_cat': task2_cat_cols,
    'feature_cols_num': task2_num_cols
}, os.path.join(MODELS_DIR, 'rf_flow_model.pkl'))

print(f"      Saved model artifacts to {MODELS_DIR}", flush=True)

# [7/7] Generating Actual vs Predicted CSV Outputs...
print("\n[7/7] Generating Actual vs Predicted Validation Tables for Held-Out Test Data...", flush=True)

# Task 1 Validation Table
df_actual_vs_pred_purpose = pd.DataFrame({
    'Area_Name': df_test['Area_Name'].values,
    'Actual_Purpose': y1_test.values,
    'Predicted_Purpose': preds1_rf,
    'Correct': (y1_test.values == preds1_rf)
})
df_actual_vs_pred_purpose.to_csv(os.path.join(OUTPUT_DIR, 'actual_vs_predicted_purpose.csv'), index=False)

# Task 2 Validation Table
df_actual_vs_pred_flow = pd.DataFrame({
    'Area_Name': df_test['Area_Name'].values,
    'Actual_Flow': y2_test.values,
    'Predicted_Flow': preds2_rf,
    'Correct': (y2_test.values == preds2_rf)
})
df_actual_vs_pred_flow.to_csv(os.path.join(OUTPUT_DIR, 'actual_vs_predicted_flow.csv'), index=False)

print("\n--- Sample Held-Out Test Predictions: Task 1 (Purpose) ---")
print(df_actual_vs_pred_purpose[['Area_Name', 'Actual_Purpose', 'Predicted_Purpose', 'Correct']].head(10).to_string(index=False))

print("\n--- Sample Held-Out Test Predictions: Task 2 (Migration Flow) ---")
print(df_actual_vs_pred_flow[['Area_Name', 'Actual_Flow', 'Predicted_Flow', 'Correct']].head(10).to_string(index=False))

print("\n==================================================", flush=True)
print("   GUJARAT MIGRATION ML PIPELINE COMPLETE!        ", flush=True)
print("==================================================", flush=True)

