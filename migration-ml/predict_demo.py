import os
import sys
import pandas as pd
import joblib

# Load saved model pipelines
BASE_DIR = r"D:\Sahay\migration-ml"
PURPOSE_MODEL_PATH = os.path.join(BASE_DIR, "models", "rf_purpose_model.pkl")
FLOW_MODEL_PATH = os.path.join(BASE_DIR, "models", "rf_flow_model.pkl")

if not os.path.exists(PURPOSE_MODEL_PATH) or not os.path.exists(FLOW_MODEL_PATH):
    print(f"Error: Saved model artifacts missing in {os.path.join(BASE_DIR, 'models')}")
    print("Please run `python prepare_demo.py` first to train and save the model pipelines.")
    sys.exit(1)

# Artifact 1: Purpose Model
purpose_artifacts = joblib.load(PURPOSE_MODEL_PATH)
prep_purpose = purpose_artifacts['preprocessor']
model_purpose = purpose_artifacts['model']
classes_purpose = purpose_artifacts['classes']

# Artifact 2: Flow Model
flow_artifacts = joblib.load(FLOW_MODEL_PATH)
prep_flow = flow_artifacts['preprocessor']
model_flow = flow_artifacts['model']
classes_flow = flow_artifacts['classes']

DISTRICT_OPTIONS = [
    'Ahmadabad', 'Anand', 'Banas Kantha', 'Bharuch', 'Bhavnagar',
    'Dohad', 'Gandhinagar', 'Jamnagar', 'Junagadh', 'Kachchh',
    'Kheda', 'Mahesana', 'Narmada', 'Navsari', 'Patan',
    'Panch Mahals', 'Porbandar', 'Rajkot', 'Sabar Kantha', 'Surat',
    'Surendranagar', 'Tapi', 'The Dangs', 'Vadodara', 'Valsad'
]

DURATION_OPTIONS = [
    'Duration of residence less than 1 year',
    'Duration of residence 1-4 years',
    'Duration of residence 5-9 years',
    'Duration of residence 10 years and above'
]

ORIGIN_LOCATION_OPTIONS = [
    'Elsewhere in the district of enumeration',
    'In other districts of enumeration state',
    'Rajasthan',
    'Maharashtra',
    'Madhya Pradesh',
    'Uttar Pradesh',
    'Bihar',
    'Other States in India',
    'Countries in Asia beyond India',
    'Other Countries'
]

def infer_origin_scope(origin_location):
    last_res = str(origin_location).lower()
    if 'district' in last_res:
        return 'Intra-State (Same/Other District)'
    elif 'countries' in last_res or 'foreign' in last_res or last_res in ['countries in asia beyond india', 'other countries']:
        return 'International'
    else:
        return 'Inter-State'

def run_prediction(district, destination_type, duration, origin_location, origin_type, male_ratio, stream_volume):
    """
    Runs saved Random Forest model pipelines for Task 1 and Task 2 and displays predictions.
    """
    scope = infer_origin_scope(origin_location)

    # 1. Task 1 Input DataFrame
    df1_input = pd.DataFrame([{
        'Area_Name': district,
        'Enum_Rural_Urban': destination_type,
        'Duration_Of_Residence': duration,
        'Last_Residence_Type': origin_location,
        'Last_Res_Rural_Urban': origin_type,
        'Origin_Scope': scope,
        'Male_Proportion': male_ratio,
        'Total_Persons': stream_volume
    }])

    # 2. Task 2 Input DataFrame (LEAKAGE-FREE: Excludes destination_type and origin_type)
    df2_input = pd.DataFrame([{
        'Area_Name': district,
        'Duration_Of_Residence': duration,
        'Last_Residence_Type': origin_location,
        'Origin_Scope': scope,
        'Male_Proportion': male_ratio,
        'Total_Persons': stream_volume
    }])

    # Model Inference
    prep1_data = prep_purpose.transform(df1_input)
    pred_purpose = model_purpose.predict(prep1_data)[0]
    probs_purpose = model_purpose.predict_proba(prep1_data)[0]

    prep2_data = prep_flow.transform(df2_input)
    pred_flow = model_flow.predict(prep2_data)[0]
    probs_flow = model_flow.predict_proba(prep2_data)[0]

    print("\n==================================================")
    print("   GUJARAT CENSUS MIGRATION ML PREDICTION RESULT  ")
    print("==================================================")
    print("DEMOGRAPHIC SAMPLE PROFILE:")
    print(f"  - Destination District : {district} ({destination_type})")
    print(f"  - Origin Location     : {origin_location} ({origin_type})")
    print(f"  - Duration of Stay    : {duration}")
    print(f"  - Sex Ratio           : {male_ratio*100:.1f}% Male / {(1-male_ratio)*100:.1f}% Female")
    print(f"  - Stream Size Volume  : {stream_volume} persons")
    
    print("\n--------------------------------------------------")
    print(" >>> TASK 1: MIGRATION PURPOSE PREDICTION")
    print("--------------------------------------------------")
    print("INPUT FEATURES USED BY TASK 1 MODEL:")
    print(f"  - Destination District : {district}")
    print(f"  - Destination Type     : {destination_type}")
    print(f"  - Origin Location     : {origin_location}")
    print(f"  - Origin Type         : {origin_type}")
    print(f"  - Origin Scope        : {scope}")
    print(f"  - Duration of Stay    : {duration}")
    print(f"  - Sex Ratio           : {male_ratio*100:.1f}% Male / {(1-male_ratio)*100:.1f}% Female")
    print(f"  - Stream Size Volume  : {stream_volume} persons")
    print("\nMODEL OUTPUT:")
    print(f"  Predicted Migration Purpose: {pred_purpose.upper()}")
    print("\n  Model Probability Distribution:")
    pairs_p = sorted(zip(classes_purpose, probs_purpose), key=lambda x: x[1], reverse=True)
    for cat, prob in pairs_p:
        bar = "#" * int(prob * 25)
        print(f"    * {cat:<22} : {prob*100:5.1f}%  {bar}")

    print("\n--------------------------------------------------")
    print(" >>> TASK 2: MIGRATION FLOW PREDICTION (RURAL/URBAN)")
    print("--------------------------------------------------")
    print("INPUT FEATURES USED BY TASK 2 MODEL (LEAKAGE-FREE):")
    print(f"  - Destination District : {district}")
    print(f"  - Origin Location     : {origin_location}")
    print(f"  - Origin Scope        : {scope}")
    print(f"  - Duration of Stay    : {duration}")
    print(f"  - Sex Ratio           : {male_ratio*100:.1f}% Male / {(1-male_ratio)*100:.1f}% Female")
    print(f"  - Stream Size Volume  : {stream_volume} persons")
    print("  [Note: Destination Rural/Urban and Origin Rural/Urban are excluded from inputs to prevent target leakage]")
    print("\nMODEL OUTPUT:")
    print(f"  Predicted Migration Flow: {pred_flow.upper()}")
    print("\n  Model Probability Distribution:")
    pairs_f = sorted(zip(classes_flow, probs_flow), key=lambda x: x[1], reverse=True)
    for cat, prob in pairs_f:
        bar = "#" * int(prob * 25)
        print(f"    * {cat:<22} : {prob*100:5.1f}%  {bar}")
    print("==================================================\n")

def prompt_menu_choice(title, options, allow_custom=False):
    print(f"\n{title}")
    for idx, opt in enumerate(options, 1):
        print(f"  [{idx}] {opt}")
    if allow_custom:
        print(f"  [{len(options)+1}] Enter custom text")
    
    while True:
        choice = input("Select option number or type name: ").strip()
        if choice.isdigit():
            val = int(choice)
            if 1 <= val <= len(options):
                return options[val-1]
            elif allow_custom and val == len(options) + 1:
                return input("Enter custom string: ").strip()
        if choice in options:
            return choice
        if allow_custom and choice:
            return choice
        print("Invalid choice. Please enter a valid number from the list.")

def prompt_float(prompt_text, min_val=0.0, max_val=1.0, default=0.5):
    while True:
        user_input = input(f"{prompt_text} (e.g., 0.85 for 85% male) [default: {default}]: ").strip()
        if not user_input:
            return default
        try:
            val = float(user_input)
            if val > 1.0 and val <= 100.0:
                val = val / 100.0
            if min_val <= val <= max_val:
                return val
            print(f"Value must be between {min_val} and {max_val}.")
        except ValueError:
            print("Please enter a valid numeric value.")

def prompt_int(prompt_text, min_val=1, default=500):
    while True:
        user_input = input(f"{prompt_text} [default: {default}]: ").strip()
        if not user_input:
            return default
        try:
            val = int(user_input)
            if val >= min_val:
                return val
            print(f"Value must be at least {min_val}.")
        except ValueError:
            print("Please enter a valid integer.")

def interactive_cli():
    print("\n==================================================")
    print("   GUJARAT MIGRATION ML PREDICTIVE INTERFACE      ")
    print("==================================================")

    while True:
        print("\nEnter Migration Demographic Profile Details:")
        
        district = prompt_menu_choice("Select Destination District:", DISTRICT_OPTIONS, allow_custom=True)
        destination_type = prompt_menu_choice("Select Destination Area Type:", ['Urban', 'Rural'])
        origin_location = prompt_menu_choice("Select Origin Location:", ORIGIN_LOCATION_OPTIONS, allow_custom=True)
        origin_type = prompt_menu_choice("Select Origin Area Type:", ['Rural', 'Urban'])
        duration = prompt_menu_choice("Select Duration of Stay:", DURATION_OPTIONS)
        male_ratio = prompt_float("Enter Proportion of Male Migrants", min_val=0.0, max_val=1.0, default=0.75)
        stream_volume = prompt_int("Enter Stream Population Volume", min_val=1, default=450)

        run_prediction(district, destination_type, duration, origin_location, origin_type, male_ratio, stream_volume)

        again = input("Would you like to make another prediction? (y/n) [default: y]: ").strip().lower()
        if again in ['n', 'no']:
            print("\nExiting Gujarat Migration Predictor. Good luck with your professor presentation!")
            break

def run_preset_demo():
    print("\nRunning Preset Demonstration Profiles...")
    
    print("\n--- Profile 1: Male Interstate Migrant Worker Stream to Urban Ahmadabad ---")
    run_prediction(
        district='Ahmadabad',
        destination_type='Urban',
        duration='Duration of residence 1-4 years',
        origin_location='Rajasthan',
        origin_type='Rural',
        male_ratio=0.85,
        stream_volume=450
    )

    print("\n--- Profile 2: Female Marriage/Household Stream in Rural Anand ---")
    run_prediction(
        district='Anand',
        destination_type='Rural',
        duration='Duration of residence 10 years and above',
        origin_location='Elsewhere in the district of enumeration',
        origin_type='Rural',
        male_ratio=0.15,
        stream_volume=1200
    )

    print("\n--- Profile 3: Industrial Migrant Stream in Urban Surat ---")
    run_prediction(
        district='Surat',
        destination_type='Urban',
        duration='Duration of residence 5-9 years',
        origin_location='Uttar Pradesh',
        origin_type='Rural',
        male_ratio=0.92,
        stream_volume=1850
    )

if __name__ == '__main__':
    if len(sys.argv) > 1 and '--preset' in sys.argv:
        run_preset_demo()
    else:
        interactive_cli()




