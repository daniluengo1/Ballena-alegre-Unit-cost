import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import './index.css';

function formatEuro(num) {
  if (num === null || num === undefined) return '0,00 €';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(num);
}

function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('es-ES').format(num);
}

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Filters
  const [hideZeroInventory, setHideZeroInventory] = useState(false);
  const [qtyGreaterThanZero, setQtyGreaterThanZero] = useState(false);
  const [hideNegativeValuation, setHideNegativeValuation] = useState(false);
  
  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Obtenemos los datos estáticos desde la misma carpeta
      const res = await fetch('./data.json');
      const jsonData = await res.json();
      setData(jsonData);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  const filteredData = useMemo(() => {
    let result = [...data];
    
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      result = result.filter(d => 
        d.itemNo.toLowerCase().includes(lower) || 
        d.description.toLowerCase().includes(lower)
      );
    }
    
    if (hideZeroInventory) {
      result = result.filter(d => d.inventoryQuantity !== 0);
    }
    if (qtyGreaterThanZero) {
      result = result.filter(d => d.inventoryQuantity > 0);
    }
    if (hideNegativeValuation) {
      result = result.filter(d => d.inventoryQuantity >= 0 && d.bcValuation >= 0 && d.realValuation >= 0);
    }
    
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key] || 0;
        let bVal = b[sortConfig.key] || 0;
        
        if (sortConfig.key === 'itemNo') {
          aVal = String(a.itemNo).toLowerCase();
          bVal = String(b.itemNo).toLowerCase();
        }
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return result;
  }, [data, debouncedSearch, hideZeroInventory, qtyGreaterThanZero, hideNegativeValuation, sortConfig]);

  const summary = useMemo(() => {
    let totalBcVal = 0;
    let totalRealVal = 0;
    let totalDiffVal = 0;

    filteredData.forEach(d => {
      totalBcVal += d.bcValuation || 0;
      totalRealVal += d.realValuation || 0;
      totalDiffVal += d.diffValuation || 0;
    });

    return { totalBcVal, totalRealVal, totalDiffVal };
  }, [filteredData]);

  const handleExport = () => {
    const exportData = filteredData.map(item => ({
      'Producto': item.itemNo,
      'Descripción': item.description,
      'Inventario': item.inventoryQuantity,
      'Coste BC': item.bcUnitCost,
      'Coste Real': item.realUnitCost,
      'Dif. Coste': item.diffUnitCost,
      'Val. Inv. BC': item.bcValuation,
      'Val. Inv. Real': item.realValuation,
      'Dif. Valoración': item.diffValuation
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Análisis Costes");
    XLSX.writeFile(wb, "Ballena_Alegre_Analisis.xlsx");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Ballena Alegre</h1>
              <p className="text-sm text-slate-500 mt-1">Análisis de Coste Medio e Inventario Real vs BC</p>
            </div>
            <div className="flex gap-4">
              <input 
                type="text" 
                placeholder="Buscar producto..." 
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button 
                onClick={handleExport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exportar a Excel
              </button>
              <button 
                onClick={loadData}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Actualizar
              </button>
            </div>
          </div>
          <div className="flex gap-6 items-center pt-4 border-t border-slate-100 text-sm text-slate-600">
            <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors">
              <input 
                type="checkbox" 
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                checked={hideZeroInventory}
                onChange={e => setHideZeroInventory(e.target.checked)}
              />
              Omitir inventarios a 0
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors">
              <input 
                type="checkbox" 
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                checked={qtyGreaterThanZero}
                onChange={e => setQtyGreaterThanZero(e.target.checked)}
              />
              Cantidad mayor a 0
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors">
              <input 
                type="checkbox" 
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                checked={hideNegativeValuation}
                onChange={e => setHideNegativeValuation(e.target.checked)}
              />
              Omitir valoración negativa
            </label>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-colors">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Inventario BC</p>
              <h2 className="text-2xl font-bold text-slate-900">{formatEuro(summary.totalBcVal)}</h2>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-indigo-200 transition-colors">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Inventario Real</p>
              <h2 className="text-2xl font-bold text-slate-900">{formatEuro(summary.totalRealVal)}</h2>
            </div>
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-rose-200 transition-colors">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Diferencia Total</p>
              <h2 className={`text-2xl font-bold ${summary.totalDiffVal < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatEuro(summary.totalDiffVal)}
              </h2>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${summary.totalDiffVal < 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('itemNo')}>
                    Producto{getSortIcon('itemNo')}
                  </th>
                  <th className="p-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('inventoryQuantity')}>
                    Inventario{getSortIcon('inventoryQuantity')}
                  </th>
                  <th className="p-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('bcUnitCost')}>
                    Coste BC{getSortIcon('bcUnitCost')}
                  </th>
                  <th className="p-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('realUnitCost')}>
                    Coste Real{getSortIcon('realUnitCost')}
                  </th>
                  <th className="p-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('diffUnitCost')}>
                    Dif. Coste{getSortIcon('diffUnitCost')}
                  </th>
                  <th className="p-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('bcValuation')}>
                    Val. Inv. BC{getSortIcon('bcValuation')}
                  </th>
                  <th className="p-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('realValuation')}>
                    Val. Inv. Real{getSortIcon('realValuation')}
                  </th>
                  <th className="p-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('diffValuation')}>
                    Dif. Valoración{getSortIcon('diffValuation')}
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {loading && data.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-500">Cargando datos...</td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-500">No hay productos que coincidan con la búsqueda.</td>
                  </tr>
                ) : (
                  filteredData.map((item, idx) => {
                    const isDiffCost = Math.abs(item.diffUnitCost) > 0.001;
                    const isDiffVal = Math.abs(item.diffValuation) > 0.01;
                    
                    return (
                      <tr 
                        key={idx} 
                        onClick={() => setSelectedProduct(item)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors group"
                      >
                        <td className="p-4">
                          <div className="font-semibold text-blue-600 group-hover:text-blue-800 transition-colors">{item.itemNo}</div>
                          <div className="text-xs text-slate-500 line-clamp-1">{item.description}</div>
                        </td>
                        <td className="p-4 text-right font-medium text-slate-700">{formatNumber(item.inventoryQuantity)}</td>
                        <td className="p-4 text-right text-slate-600">{formatEuro(item.bcUnitCost)}</td>
                        <td className="p-4 text-right font-medium text-slate-800">{formatEuro(item.realUnitCost)}</td>
                        <td className={`p-4 text-right font-medium ${isDiffCost ? (item.diffUnitCost > 0 ? 'text-rose-500' : 'text-emerald-500') : 'text-slate-400'}`}>
                          {formatEuro(item.diffUnitCost)}
                        </td>
                        <td className="p-4 text-right text-slate-600">{formatEuro(item.bcValuation)}</td>
                        <td className="p-4 text-right font-medium text-slate-800">{formatEuro(item.realValuation)}</td>
                        <td className={`p-4 text-right font-bold ${isDiffVal ? (item.diffValuation > 0 ? 'text-rose-600' : 'text-emerald-600') : 'text-slate-400'}`}>
                          {formatEuro(item.diffValuation)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr className="font-bold text-slate-900 text-sm">
                  <td className="p-4 uppercase tracking-wider text-slate-500 text-xs">Total Filtrado</td>
                  <td colSpan="4"></td>
                  <td className="p-4 text-right text-slate-700">{formatEuro(summary.totalBcVal)}</td>
                  <td className="p-4 text-right text-slate-900">{formatEuro(summary.totalRealVal)}</td>
                  <td className={`p-4 text-right ${summary.totalDiffVal < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatEuro(summary.totalDiffVal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>

      {/* Drill-down Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedProduct.itemNo} - {selectedProduct.description}</h3>
                <div className="flex gap-6 mt-2 text-sm text-slate-600">
                  <div>Inventario actual: <span className="font-semibold text-slate-900">{formatNumber(selectedProduct.inventoryQuantity)}</span></div>
                  <div>Coste medio real: <span className="font-semibold text-slate-900">{formatEuro(selectedProduct.realUnitCost)}</span></div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-0 overflow-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white shadow-sm ring-1 ring-slate-100">
                  <tr className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Nº Documento</th>
                    <th className="p-4 text-right">Cantidad</th>
                    <th className="p-4 text-right">Precio de Compra Total</th>
                    <th className="p-4 text-right">Precio de Compra Unitario</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {selectedProduct.purchases.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-500">No hay movimientos de compra para este producto.</td>
                    </tr>
                  ) : (
                    selectedProduct.purchases.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-slate-600">{p.date}</td>
                        <td className="p-4 font-medium text-slate-800">{p.docNo}</td>
                        <td className="p-4 text-right font-medium text-blue-600">{formatNumber(p.quantity)}</td>
                        <td className="p-4 text-right text-slate-700">{formatEuro(p.totalCost)}</td>
                        <td className="p-4 text-right font-semibold text-slate-900">{formatEuro(p.unitCost)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
