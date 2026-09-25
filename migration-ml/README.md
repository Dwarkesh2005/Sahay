# Gujarat Census 2011 Migration ML Project

This repository contains an end-to-end Machine Learning implementation built on the **Gujarat Census 2011 Migration Dataset (`Table D-3`: `DS-2400-D03-MDDS.XLSX`)** designed for academic presentation and demonstration.

---

## 📌 Executive Summary & Project Problem Statement

The goal of this project is to apply supervised Machine Learning to model migration patterns in Gujarat across two distinct tasks specified by the faculty:

1. **Task 1 — Purpose of Migration**: Predict the primary reason for migration (`Dominant_Purpose` multiclass target across 7 categories: `Moved with household`, `Work/employment`, `Marriage`, `Others`, `Moved after birth`, `Business`, `Education`).
2. **Task 2 — Kind/Type of Migration (Migration Flow)**: Predict the rural/urban stream direction (`Migration_Flow` 4-class target: `Rural → Rural`, `Rural → Urban`, `Urban → Rural`, `Urban → Urban`).

---

## 📊 Statistical Analysis vs. Machine Learning Prediction

A critical distinction in this project is the difference between **Descriptive Statistical Findings** and **Predictive Machine Learning**:

| Dimension | Statistical Analysis | Machine Learning Prediction |
| :--- | :--- | :--- |
| **Objective** | Describe observed Census population totals and proportions. | Generalize underlying patterns to infer labels for unseen migration streams. |
| **Data Usage** | Evaluated on the complete historical dataset (9,559 stream records). | Evaluated strictly on **held-out unseen test districts** (2,320 records). |
| **Output** | Aggregated counts, percentages, sex ratios, and summary tables. | Out-of-sample label predictions with confidence probability distributions. |
| **Validation** | Data summaries and descriptive charts. | Ground-truth held-out validation (`Actual vs. Predicted` comparisons). |

---

## 📂 Dataset & Granular Stream Construction

- **Raw Source**: Gujarat Census 2011 (`Table D-3`), consisting of 50,628 raw macro-aggregated summary rows.
- **Usable Granular Dataset**: **9,559 atomic demographic migration stream records** extracted after filtering top-level totals (State totals, 'All durations of residence', and macro summary origins).
- **Location**: Cleaned dataset saved at `outputs/processed_data/cleaned_granular_migration.csv`.

---

## 🛡️ Target Definitions & Leakage Prevention

### Task 1: Purpose of Migration
- **Target**: `Dominant_Purpose` (Multi-class target derived via `idxmax` across row-level Census purpose counts).
- **Class Distribution**:
  - `Moved with household`: 41.6% (3,981 rows)
  - `Work/employment`: 26.6% (2,540 rows)
  - `Marriage`: 21.2% (2,024 rows)
  - `Others`: 5.5% (525 rows)
  - `Moved after birth`: 2.4% (230 rows)
  - `Business`: 1.6% (151 rows)
  - `Education`: 1.1% (108 rows)
- **Features Used**: `Area_Name`, `Enum_Rural_Urban`, `Duration_Of_Residence`, `Last_Residence_Type`, `Last_Res_Rural_Urban`, `Origin_Scope`, `Male_Proportion`, `Total_Persons`.
- **Target Leakage Control**: All raw Census purpose count columns (`Work_Persons`, `Marriage_Persons`, etc.) are strictly excluded from input features.

### Task 2: Kind/Type of Migration (Migration Flow)
- **Target**: `Migration_Flow` = `Last_Res_Rural_Urban` (Origin) + `" -> "` + `Enum_Rural_Urban` (Destination).
- **Class Distribution**:
  - `Urban -> Urban`: 28.7% (2,739 rows)
  - `Rural -> Urban`: 25.1% (2,397 rows)
  - `Rural -> Rural`: 23.5% (2,249 rows)
  - `Urban -> Rural`: 22.7% (2,174 rows)
- **Features Used (STRICT LEAKAGE FREE)**: `Area_Name`, `Duration_Of_Residence`, `Last_Residence_Type`, `Origin_Scope`, `Male_Proportion`, `Total_Persons`.
- **Target Leakage Control**: `Last_Res_Rural_Urban` and `Enum_Rural_Urban` are **completely removed from input features for Task 2** to prevent circular inference.

---

## 📐 District-Level Spatial Train/Test Methodology

To prevent spatial data leakage and evaluate real-world generalization:
- **Splitting Method**: `GroupShuffleSplit` on `Area_Name` (District Grouping).
- **Training Set**: **7,239 records across 20 districts** (80%).
- **Held-Out Test Set**: **2,320 records across 6 completely unseen districts** (20%).
- **Verification**: Zero district overlap between training and testing sets.

---

## 📈 Empirical Model Evaluation & Baseline Comparison

Models evaluated on the held-out unseen test districts:

### Task 1 Evaluation (Migration Purpose)
| Model | Accuracy | Macro F1-Score | Weighted F1-Score |
| :--- | :---: | :---: | :---: |
| **DummyClassifier** (Most Frequent) | 43.36% | 0.0864 | 0.2623 |
| **Logistic Regression** (Balanced) | 44.96% | 0.3147 | 0.5026 |
| **Random Forest Classifier** (Balanced) | **57.97%** | **0.3832** | **0.6069** |

### Task 2 Evaluation (Migration Flow: Rural/Urban)
| Model | Accuracy | Macro F1-Score | Weighted F1-Score |
| :--- | :---: | :---: | :---: |
| **DummyClassifier** (Most Frequent) | 29.83% | 0.1149 | 0.1371 |
| **Logistic Regression** (Balanced) | 31.85% | 0.3151 | 0.3129 |
| **Random Forest Classifier** (Balanced) | **44.48%** | **0.4186** | **0.4232** |

---

## 🚀 How to Run and Demonstrate to the Professor

### 1. Execute Full Training & Evaluation Pipeline
Re-cleans raw Census data, performs spatial splitting, trains all models (Dummy, Logistic Regression, Random Forest), outputs metric tables, generates confusion matrices, feature importance plots, and exports validation CSVs:
```bash
python prepare_demo.py
```

### 2. Run Interactive Dual-Task Live Prediction CLI
Demonstrates real-time model inference for hypothetical migrant profile streams (outputs both Purpose and Migration Flow with confidence probabilities):
```bash
python predict_demo.py
```

---

## 📁 Key Project Artifacts & File Locations

- **Cleaned Granular Dataset**: `outputs/processed_data/cleaned_granular_migration.csv`
- **Saved Model Pipelines**:
  - Purpose Model: `models/rf_purpose_model.pkl`
  - Flow Model: `models/rf_flow_model.pkl`
- **Evaluation Validation CSVs**:
  - `outputs/actual_vs_predicted_purpose.csv`
  - `outputs/actual_vs_predicted_flow.csv`
  - `outputs/metrics/demo_metrics.csv`
- **Visualizations**:
  - Target Distributions: `outputs/figures/purpose_distribution.png`, `outputs/figures/flow_distribution.png`
  - Confusion Matrices: `outputs/figures/confusion_matrix.png`, `outputs/figures/confusion_matrix_flow.png`
  - Feature Importances: `outputs/figures/feature_importance.png`, `outputs/figures/feature_importance_flow.png`

