import json

with open('public/DB_GameMaster.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("--- HERO SAMPLE ---")
if 'Hero' in data and len(data['Hero']) > 0:
    print(json.dumps(data['Hero'][0], indent=2))
else:
    print("No Hero data found")

print("\n--- WEAPON ITEM SAMPLE ---")
if 'WeaponItem' in data and len(data['WeaponItem']) > 0:
    print(json.dumps(data['WeaponItem'][0], indent=2))
else:
    print("No WeaponItem data found")
