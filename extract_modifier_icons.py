import os
import shutil
import re

SOURCE_DIR = r"c:/Users/defia/Desktop/rampage2/fullgamedecompiled/Resources/Art2D/Icons/Modifier/db_icons_modifier/sprites"
TARGET_DIR = r"c:/Users/defia/Desktop/rampage2/fullgamedecompiled/shop_viewer/public/icons"

def main():
    if not os.path.exists(TARGET_DIR):
        os.makedirs(TARGET_DIR)

    pattern = re.compile(r"DefineSprite_\d+_(icon_modifier_.+)")
    
    count = 0
    for folder_name in os.listdir(SOURCE_DIR):
        match = pattern.match(folder_name)
        if match:
            icon_name = match.group(1)
            folder_path = os.path.join(SOURCE_DIR, folder_name)
            
            # Look for png files
            found = False
            for file in os.listdir(folder_path):
                if file.endswith(".png"):
                    src_file = os.path.join(folder_path, file)
                    dst_file = os.path.join(TARGET_DIR, f"{icon_name}.png")
                    shutil.copy2(src_file, dst_file)
                    print(f"Copied {icon_name}.png")
                    count += 1
                    found = True
                    break # Just take the first png found
            
            if not found:
                print(f"Warning: No PNG found for {icon_name} in {folder_path}")

    print(f"Finished copying {count} icons.")

if __name__ == "__main__":
    main()
