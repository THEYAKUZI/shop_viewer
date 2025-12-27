import json
import os

try:
    with open('public/DB_GameMaster.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    legendary_info = []

    def scan_modifiers(obj):
        if isinstance(obj, dict):
            # Check for Legendary status
            is_legendary = obj.get('IsLegendary') or obj.get('isLegendary') or obj.get('Rarity') == 'LEGENDARY'
            
            if is_legendary:
                name = obj.get('Name')
                desc = obj.get('Description')
                if name:
                    legendary_info.append({'Name': name, 'Description': desc})
            
            # Continue scanning children
            for k, v in obj.items():
                scan_modifiers(v)
        elif isinstance(obj, list):
            for item in obj:
                scan_modifiers(item)

    scan_modifiers(data)

    print("LEGENDARY_INFO_START")
    # Deduplicate based on Name
    seen_names = set()
    for item in sorted(legendary_info, key=lambda x: x['Name']):
        if item['Name'] not in seen_names:
            print(f"NAME: {item['Name']}")
            print(f"DESC: {item['Description']}")
            print("---")
            seen_names.add(item['Name'])
    print("LEGENDARY_INFO_END")

except Exception as e:
    print(f"Error: {e}")
