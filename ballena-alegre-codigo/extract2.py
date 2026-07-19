import json
import xml.etree.ElementTree as ET
import os

def extract_compras(xml_path, output_json):
    print("Extracting from", xml_path)
    compras = []
    
    context = ET.iterparse(xml_path, events=('start', 'end'))
    row_data = {}
    cur_col = None
    cur_text = ''
    
    for event, elem in context:
        tag = elem.tag.split('}')[-1]
        
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
                b_val = row_data.get('B', '').strip()
                if b_val == 'Compra':
                    compras.append(row_data)
                row_data = {}
                elem.clear()
            elif tag == 'sheetData':
                # Reached end of rows
                pass
                
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(compras, f)
    
    print(f"Extracted {len(compras)} compras successfully to {output_json}")

if __name__ == '__main__':
    extract_compras('temp_fast_extract/xl/worksheets/sheet1.xml', 'compras_final.json')
