import json

try:
    with open('public/DB_GameMaster.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    special_modifiers = []

    def scan(obj):
        if isinstance(obj, dict):
            # Detailed Modifier Definition Pattern
            if 'Constant' in obj and 'Name' in obj and 'Description' in obj and 'Id' in obj:
                # We want to capture things that look like "Definitions" of modifiers
                # Usually these have integer IDs, and specific Constant names
                special_modifiers.append(obj)
            
            for k, v in obj.items():
                scan(v)
        elif isinstance(obj, list):
            for item in obj:
                scan(item)

    scan(data)

    print("SPECIAL_MODS_START")
    unique_mods = {m['Name']: m for m in special_modifiers} # Deduplicate by Name
    for name, mod in sorted(unique_mods.items()):
        print(f"NAME: {name}")
        print(f"DESC: {mod['Description']}")
        print("---")
    print("SPECIAL_MODS_END")

except Exception as e:
    print(f"Error: {e}")
