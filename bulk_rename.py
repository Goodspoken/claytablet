import os

replacements = {
    "ClayTablet": "ClayTablet",
    "claytablet": "claytablet",
    "CLAY": "CLAY",
    "claytablet.online": "claytablet.online",
    "claytablet.online": "claytablet.online",
    "claytablet/claytablet": "claytablet/claytablet",
}

# Special casing for any edge cases
def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception:
        return
        
    original = content
    # Order matters: replace longer domains first
    content = content.replace("claytablet.online", "claytablet.online")
    content = content.replace("claytablet.online", "claytablet.online")
    content = content.replace("claytablet/claytablet", "claytablet/claytablet")
    content = content.replace("ClayTablet", "ClayTablet")
    content = content.replace("claytablet", "claytablet")
    content = content.replace("CLAY", "CLAY")
        
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk('.'):
    # Exclude certain directories
    dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', 'dist', '__pycache__', 'venv', '.vscode', '.github', '.claude', '.agents']]
    for file in files:
        if file.endswith(('.md', '.py', '.ts', '.tsx', '.json', '.yml', '.yaml', '.ps1', '.sh', '.html', '.css', '.toml', '.rs', '.go', '.conf')):
            replace_in_file(os.path.join(root, file))
