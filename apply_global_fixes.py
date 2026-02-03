import os

# Configuration
target_css = 'logo-styles.css'
target_js_loading = 'logo-loading.js'
target_js_loader = 'logo-loader.js'

def get_relative_path_prefix(file_path, root_dir):
    """Calculates the relative path prefix (e.g., '../') based on file depth."""
    rel_path = os.path.relpath(os.path.dirname(file_path), root_dir)
    if rel_path == '.':
        return ''
    depth = len(rel_path.split(os.sep))
    return '../' * depth

def process_file(file_path, root_dir):
    """Injects missing CSS and JS into the HTML file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    prefix = get_relative_path_prefix(file_path, root_dir)
    
    # Construct tag strings with correct paths
    css_tag = f'<link rel="stylesheet" href="{prefix}{target_css}">'
    js_loading_tag = f'<script src="{prefix}{target_js_loading}"></script>'
    js_loader_tag = f'<script src="{prefix}{target_js_loader}"></script>'

    # 1. Inject CSS
    if target_css not in content:
        # Try to insert after logo-loading.css
        if 'logo-loading.css' in content:
             content = content.replace('logo-loading.css">', f'logo-loading.css">\n    {css_tag}')
        # Fallback: Insert before </head>
        elif '</head>' in content:
            content = content.replace('</head>', f'    {css_tag}\n</head>')
        else:
            print(f"Warning: Could not find insertion point for CSS in {file_path}")

    # 2. Inject JS
    # Check for loading JS
    if target_js_loading not in content:
        # Insert before loader if present
        if target_js_loader in content:
             content = content.replace(f'<script src="{prefix}{target_js_loader}"></script>', f'{js_loading_tag}\n    {js_loader_tag}')
        elif '</body>' in content:
             content = content.replace('</body>', f'    {js_loading_tag}\n</body>')

    # Check for loader JS
    if target_js_loader not in content:
         if '</body>' in content:
             content = content.replace('</body>', f'    {js_loader_tag}\n</body>')

    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    root_dir = os.getcwd()
    modified_count = 0
    
    print(f"Scanning from root: {root_dir}")

    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Skip node_modules and hidden dirs
        if 'node_modules' in dirpath or '/.' in dirpath:
            continue
            
        for filename in filenames:
            if filename.endswith('.html'):
                file_path = os.path.join(dirpath, filename)
                if process_file(file_path, root_dir):
                    print(f"Updated: {os.path.relpath(file_path, root_dir)}")
                    modified_count += 1
    
    print(f"\nTotal files updated: {modified_count}")

if __name__ == "__main__":
    main()
