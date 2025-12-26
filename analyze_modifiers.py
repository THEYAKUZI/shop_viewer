import json

with open('public/DB_GameMaster.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

mod_names = set()
mod_types = set()

if 'Modifiers' in data:
    for m in data['Modifiers']:
        mod_names.add(m.get('Name'))
        mod_types.add(m.get('MODIFIER_TYPE'))

if 'LegendaryModifiers' in data:
    for m in data['LegendaryModifiers']:
        mod_names.add(m.get('Name'))
        # Legendary modifiers might not have MODIFIER_TYPE or it might be unique
        mod_types.add("LEGENDARY: " + str(m.get('Name')))

print(f"Unique Modifier Names: {len(mod_names)}")
print(f"Unique Modifier Types: {len(mod_types)}")

print("Sample Types:", list(mod_types)[:10])
