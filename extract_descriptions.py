import json
import os

try:
    with open('public/DB_GameMaster.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    descriptions = set()

    def scan(obj):
        if isinstance(obj, dict):
            if 'Description' in obj and isinstance(obj['Description'], str):
                descriptions.add(obj['Description'])
            for k, v in obj.items():
                scan(v)
        elif isinstance(obj, list):
            for item in obj:
                scan(item)

    scan(data)

    print("FOUND_DESCRIPTIONS_START")
    for d in sorted(list(descriptions)):
        print(d)
    print("FOUND_DESCRIPTIONS_END")

except Exception as e:
    print(f"Error: {e}")
