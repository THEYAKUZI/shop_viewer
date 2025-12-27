import json
import os

try:
    with open('public/DB_GameMaster.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    descriptions = set()

    def scan_modifiers(obj):
        if isinstance(obj, dict):
            # Check if this object looks like a modifier with a level
            if 'MODIFIER_LEVEL' in obj and 'Description' in obj:
                try:
                    level = int(obj['MODIFIER_LEVEL'])
                    if level >= 4:
                        if isinstance(obj['Description'], str) and obj['Description'].strip():
                            descriptions.add(obj['Description'])
                except ValueError:
                    pass
            
            # Continue scanning children
            for k, v in obj.items():
                scan_modifiers(v)
        elif isinstance(obj, list):
            for item in obj:
                scan_modifiers(item)

    scan_modifiers(data)

    print("HIGH_TIER_DESCRIPTIONS_START")
    for d in sorted(list(descriptions)):
        print(d)
    print("HIGH_TIER_DESCRIPTIONS_END")

except Exception as e:
    print(f"Error: {e}")
