import express from 'express';
import cors from 'cors';
import { createRequire } from 'module';
import * as path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

const DOWNLOADS_DIR = 'C:/Users/danie/OneDrive/Escritorio/antigrabity/ballena-alegre-cost';
const REAL_DOWNLOADS_DIR = 'C:/Users/danie/Downloads';

const excelDateToString = (excelDate) => {
  if (!excelDate) return '';
  const num = parseFloat(excelDate);
  if (isNaN(num)) return String(excelDate);
  const date = new Date(Math.round((num - 25569) * 86400 * 1000));
  return date.toLocaleDateString('es-ES');
};

let cachePromise = null;
let cachedResult = null;

const doProcessData = async () => {
  console.log('⏳ Empezando a procesar los datos de Ballena Alegre...');
  const analysis = {};
  
  // 1. Read Products
  console.log('⏳ Leyendo Productos (BC Unit Cost)...');
  const prodWorkbook = XLSX.readFile(path.join(REAL_DOWNLOADS_DIR, 'Productos (92).xlsx'));
  const prodData = XLSX.utils.sheet_to_json(prodWorkbook.Sheets[prodWorkbook.SheetNames[0]]);
  
  prodData.forEach(row => {
    const itemNo = row['Nº'];
    if (!itemNo) return;
    const itemNoStr = String(itemNo).trim();
    
    analysis[itemNoStr] = {
      itemNo: itemNoStr,
      description: row['Descripción'] || 'Sin descripción',
      bcUnitCost: parseFloat(row['Coste unitario']) || 0,
      realUnitCost: 0,
      inventoryQuantity: 0,
      bcValuation: 0,
      realValuation: 0,
      diffUnitCost: 0,
      diffValuation: 0,
      purchases: [],
      totalPurchaseQty: 0,
      totalPurchaseCost: 0
    };
  });

  // 2. Read Inventory Valuation
  console.log('⏳ Leyendo Valoración de Inventario...');
  const valWorkbook = XLSX.readFile(path.join(REAL_DOWNLOADS_DIR, 'Valoración inventario (16).xlsx'));
  const hasHoja2 = valWorkbook.SheetNames.includes('Hoja2');
  
  if (hasHoja2) {
    const valData = XLSX.utils.sheet_to_json(valWorkbook.Sheets['Hoja2']);
    valData.forEach(row => {
      const itemNo = row['Nº producto'];
      if (!itemNo) return;
      const itemNoStr = String(itemNo).trim();
      
      if (!analysis[itemNoStr]) return;
      
      analysis[itemNoStr].inventoryQuantity = parseFloat(row['Cantidad_3']) || 0;
      analysis[itemNoStr].bcValuation = parseFloat(row['Valor_3']) || 0;
    });
  }

  // 3. Read Pre-extracted Movements
  console.log('⏳ Leyendo compras extraídas (compras.json)...');
  const comprasPath = path.join(DOWNLOADS_DIR, 'compras.json');
  if (!fs.existsSync(comprasPath)) {
     throw new Error('No se encontró el archivo compras.json.');
  }

  const comprasData = JSON.parse(fs.readFileSync(comprasPath, 'utf8'));
  
  comprasData.forEach(rowObj => {
      const itemNoStr = String(rowObj.E || '').trim();
      if (analysis[itemNoStr]) {
         const qty = parseFloat(rowObj.L) || 0;
         const cost = parseFloat(rowObj.P) || 0;
         
         analysis[itemNoStr].purchases.push({
           date: excelDateToString(rowObj.A),
           docNo: rowObj.D || '',
           quantity: qty,
           totalCost: cost,
           unitCost: qty !== 0 ? (cost / qty) : 0
         });
         analysis[itemNoStr].totalPurchaseQty += qty;
         analysis[itemNoStr].totalPurchaseCost += cost;
      }
  });

  // Calculate Finals
  const finalResult = Object.values(analysis).map(item => {
    let realCost = item.bcUnitCost;
    if (item.totalPurchaseQty !== 0) {
       realCost = item.totalPurchaseCost / item.totalPurchaseQty;
    }
    
    return {
      ...item,
      realUnitCost: realCost,
      diffUnitCost: realCost - item.bcUnitCost,
      realValuation: item.inventoryQuantity * realCost,
      diffValuation: (item.inventoryQuantity * realCost) - item.bcValuation
    };
  });
  
  cachedResult = finalResult.filter(i => i.inventoryQuantity !== 0 || i.purchases.length > 0);
  console.log('✅ Procesamiento de datos completado.');
  return cachedResult;
};

const processData = async () => {
  if (cachedResult) return cachedResult;
  if (!cachePromise) {
    cachePromise = doProcessData().catch(err => {
      cachePromise = null;
      throw err;
    });
  }
  return cachePromise;
};

app.get('/api/analysis', async (req, res) => {
  try {
    const data = await processData();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
});

const PORT = 3003;
app.listen(PORT, () => {
  console.log(`✅ Ballena Alegre API running on port ${PORT}`);
});
