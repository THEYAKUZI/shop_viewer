import json

def find_string(filename, search_string):
    with open(filename, 'r') as f:
        for i, line in enumerate(f):
            if search_string in line:
                print(f"Found at line {i+1}: {line.strip()}")

find_string('public/DB_GameMaster.json', "Attacks are 30% bigger!")
