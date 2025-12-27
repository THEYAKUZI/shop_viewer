import json
import os

try:
    with open('public/DB_GameMaster.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    descriptions = set()

    def scan_modifiers(obj):
        if isinstance(obj, dict):
            # Check for Legendary status
            is_legendary = obj.get('IsLegendary') or obj.get('isLegendary') or obj.get('Rarity') == 'LEGENDARY'
            
            # Also check if it's a modifier with a Name (often legendaries have specific names)
            if is_legendary and 'Description' in obj:
                 if isinstance(obj['Description'], str) and obj['Description'].strip():
                    descriptions.add(obj['Description'])
            
            # Continue scanning children
            for k, v in obj.items():
                scan_modifiers(v)
        elif isinstance(obj, list):
            for item in obj:
                scan_modifiers(item)

    scan_modifiers(data)

    print("LEGENDARY_DESCRIPTIONS_START")
    for d in sorted(list(descriptions)):
        print(d)
    print("LEGENDARY_DESCRIPTIONS_END")

except Exception as e:
    print(f"Error: {e}")
