import json

try:
    with open('public/DB_GameMaster.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    def find_string(obj, target):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if isinstance(v, str) and target.lower() in v.lower():
                    print(f"FOUND in key '{k}': {v}")
                    print(f"Full object: {obj}")
                find_string(v, target)
        elif isinstance(obj, list):
            for item in obj:
                find_string(item, target)

    print("--- SEARCHING ACCELERATION ---")
    find_string(data, "Acceleration")
    print("--- SEARCHING APTITUDE ---")
    find_string(data, "Aptitude")

except Exception as e:
    print(f"Error: {e}")
