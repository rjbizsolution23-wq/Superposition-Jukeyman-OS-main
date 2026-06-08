import os

search_dir = r"C:\Users\DELL"
exclude_dirs = {"node_modules", ".git", "Downloads", "AppData", "Local Settings", "My Documents", "PrintHood", "SendTo", "Templates", "Recent"}

print("Searching for 'minimax' in files under", search_dir)

found_files = []

for root, dirs, files in os.walk(search_dir):
    # Prune excluded directories
    dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith(".")]
    
    for file in files:
        if file.endswith((".json", ".txt", ".py", ".js", ".ts", ".sh", ".ps1", ".md", ".ini", ".conf", ".cfg")):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    if "minimax" in content.lower():
                        print(f"Found in: {path}")
                        found_files.append(path)
            except Exception:
                pass

print(f"Done. Found in {len(found_files)} files.")
