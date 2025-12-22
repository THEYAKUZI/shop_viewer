import os
import shutil
import re

SOURCE_ROOT = os.path.abspath("../Resources/Art2D/Icons/Weapons")
DEST_DIR = os.path.abspath("./public/icons")

if not os.path.exists(DEST_DIR):
    os.makedirs(DEST_DIR)

print(f"Scanning {SOURCE_ROOT}...")

# Regex to capture the name from the folder name
# format: DefineSprite_{digits}_{Name}
# e.g. DefineSprite_152_wpn_sword01_lvl01
# But sometimes it might just be DefineSprite_{digits} if mapping is in CSV.
# However, my previous listing showed the names are in the folder name for most.
# if not, I'll rely on the folder name I see.

folder_pattern = re.compile(r"DefineSprite_\d+_(.+)")

count = 0

for root, dirs, files in os.walk(SOURCE_ROOT):
    for d in dirs:
        if d.startswith("DefineSprite_"):
            match = folder_pattern.match(d)
            if match:
                icon_name = match.group(1)
                # Look for png inside
                sprite_dir = os.path.join(root, d)
                # Usually 1.png
                img_path = os.path.join(sprite_dir, "1.png")
                if os.path.exists(img_path):
                    shutil.copy2(img_path, os.path.join(DEST_DIR, f"{icon_name}.png"))
                    count += 1
                    # print(f"Copied {icon_name}")
                else:
                    # check for other pngs
                    pngs = [f for f in os.listdir(sprite_dir) if f.endswith(".png")]
                    if pngs:
                        shutil.copy2(os.path.join(sprite_dir, pngs[0]), os.path.join(DEST_DIR, f"{icon_name}.png"))
                        count += 1
                        # print(f"Copied {icon_name} from {pngs[0]}")
            else:
                # If folder is just DefineSprite_123, we can't map it without symbols.csv
                # For now, ignore non-named folders or implement CSV parsing if needed.
                # Based on previous ls, many are named.
                pass

print(f"Extracted {count} icons to {DEST_DIR}")
