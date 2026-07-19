import json
import xml.etree.ElementTree as ET

def check():
    context = ET.iterparse('temp_fast_extract/xl/worksheets/sheet1.xml', events=('start', 'end'))
    row_data = {}
    cur_col = None
    cur_text = ''
    count = 0
    res = []
    
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
                if row_data.get('E', '').strip() == '000663':
                    res.append(row_data)
                    count += 1
                if count > 20:
                    break
                row_data = {}
                elem.clear()
    
    print(json.dumps(res, indent=2))

if __name__ == '__main__':
    check()
