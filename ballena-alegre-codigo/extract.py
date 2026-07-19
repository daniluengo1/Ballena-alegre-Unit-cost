import zipfile
import json
import xml.etree.ElementTree as ET

def extract_compras(zip_path, output_json):
    print("Extracting from", zip_path)
    compras = []
    
    with zipfile.ZipFile(zip_path, 'r') as z:
        with z.open('xl/worksheets/sheet1.xml') as f:
            context = ET.iterparse(f, events=('start', 'end'))
            row_data = {}
            cur_col = None
            cur_text = ''
            
            for event, elem in context:
                tag = elem.tag.split('}')[-1] # strip namespace
                
                if event == 'start':
                    if tag == 'row':
                        row_data = {}
                    elif tag == 'c':
                        r = elem.attrib.get('r', '')
                        cur_col = ''.join([c for c in r if c.isalpha()])
                        cur_text = ''
                elif event == 'end':
                    if tag in ('v', 't'):
                        if elem.text:
                            cur_text += elem.text
                        if cur_col:
                            row_data[cur_col] = cur_text
                    elif tag == 'row':
                        if row_data.get('B', '').strip() == 'Compra':
                            compras.append(row_data)
                        row_data = {}
                        elem.clear() # clear memory
            
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(compras, f)
    
    print(f"Extracted {len(compras)} compras successfully to {output_json}")

if __name__ == '__main__':
    extract_compras('Movs. productos (51).xlsx', 'compras.json')
