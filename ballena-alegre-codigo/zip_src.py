import os
import zipfile

def zip_source():
    with zipfile.ZipFile('ballena-alegre-codigo.zip', 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk('.'):
            # Ignore bad directories
            if 'node_modules' in root or 'temp_extract' in root or 'temp_fast_extract' in root or '.git' in root:
                continue
                
            for file in files:
                # Ignore bad files
                if file.endswith('.xlsx') or file.endswith('.zip') or 'compras' in file or 'test_out' in file:
                    continue
                    
                filepath = os.path.join(root, file)
                arcname = os.path.relpath(filepath, '.')
                zf.write(filepath, arcname)
                print(f"Added {arcname}")

if __name__ == '__main__':
    zip_source()
