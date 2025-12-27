import json

try:
    with open('public/DB_GameMaster.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    modifier_names = set()

    def scan(obj):
        if isinstance(obj, dict):
            # Check for modifier structure
            if 'Name' in obj and ('MODIFIER_TYPE' in obj or 'isLegendary' in obj or 'IsLegendary' in obj):
                 modifier_names.add(obj['Name'])
            
            for k, v in obj.items():
                scan(v)
        elif isinstance(obj, list):
            for item in obj:
                scan(item)

    scan(data)

    print("MODIFIER_NAMES_START")
    for name in sorted(list(modifier_names)):
        print(name)
    print("MODIFIER_NAMES_END")

except Exception as e:
    print(f"Error: {e}")
