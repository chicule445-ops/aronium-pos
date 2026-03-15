import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Pencil, Trash2, Package, Upload, Settings2, Check } from 'lucide-react';
import { useRates } from '../context/RatesContext';
import { apiService } from '../lib/api';
import type { Product } from '../types';

export function Inventory() {
    const { bcvRate, personalRate } = useRates();
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newProduct, setNewProduct] = useState<Partial<Product>>({
        code: '',
        name: '',
        costUsd: 0,
        margin: 0.30,
        stock: 0,
        isWeightable: false,
        imageUrl: ''
    });

    const [isImporting, setIsImporting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    
    // Column Visibility Logic
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const defaultColumns = [
        { id: 'code', label: 'Código', default: true },
        { id: 'product', label: 'Producto', default: true },
        { id: 'costUsd', label: 'Costo $', default: true },
        { id: 'costBs', label: 'Costo Bs', default: false },
        { id: 'margin', label: 'Margen', default: true },
        { id: 'priceBs', label: 'Venta Bs', default: true },
        { id: 'priceUsd', label: 'Venta $', default: true },
        { id: 'stock', label: 'Existencias', default: true },
        { id: 'actions', label: 'Acciones', default: true }
    ];

    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('inventory_visible_columns');
        return saved ? JSON.parse(saved) : defaultColumns.filter(c => c.default).map(c => c.id);
    });

    useEffect(() => {
        localStorage.setItem('inventory_visible_columns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowColumnMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleColumn = (id: string) => {
        if (id === 'product') return; // Always keep product visible
        setVisibleColumns(prev => 
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const data = await apiService.products.getAll();
            setProducts(data);
            setSelectedIds([]);
        } catch (error) {
            console.error('Failed fetching products', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este producto?')) return;
        try {
            await apiService.products.delete(id);
            fetchProducts();
        } catch (error: any) {
            console.error('Delete failed', error);
            const msg = error.response?.data?.error || 'Error al eliminar el producto.';
            alert(msg);
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredProducts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredProducts.map(p => p.id));
        }
    };

    const handleFileUpload = async (file: File) => {
        try {
            const data = await apiService.uploads.uploadImage(file);
            setNewProduct(prev => ({ ...prev, imageUrl: data.imageUrl }));
        } catch (err) {
            console.error('Upload failed', err);
            alert('Error al subir la imagen.');
        }
    };

    const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                if (!text) return;

                const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                if (lines.length < 2) {
                    alert('El archivo CSV debe contener al menos un encabezado y una fila de datos.');
                    setIsImporting(false);
                    return;
                }

                const parseLine = (line: string) => {
                    const result = [];
                    let current = "";
                    let inQuotes = false;
                    const delimiter = line.includes(';') ? ';' : ',';
                    
                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        if (char === '"') inQuotes = !inQuotes;
                        else if (char === delimiter && !inQuotes) {
                            result.push(current.trim().replace(/^"|"$/g, ''));
                            current = "";
                        } else current += char;
                    }
                    result.push(current.trim().replace(/^"|"$/g, ''));
                    return result;
                };

                const headers = parseLine(lines[0]).map(h => h.toLowerCase());
                const indexMap = {
                    name: headers.findIndex(h => h.includes('nombre') || h.includes('name') || h.includes('product')),
                    costUsd: headers.findIndex(h => h.includes('costo') || h.includes('cost')),
                    margin: headers.findIndex(h => h.includes('margen') || h.includes('margin')),
                    code: headers.findIndex(h => h.includes('id') || h.includes('codigo') || h.includes('code') || h.includes('barcode')),
                    category: headers.findIndex(h => h.includes('etiqueta') || h.includes('tag') || h.includes('categoria') || h.includes('group'))
                };

                const productsToImport = lines.slice(1).map((line, idx) => {
                    const columns = parseLine(line);
                    const parseNumber = (val: string) => {
                        if (!val) return 0;
                        return parseFloat(val.replace(',', '.')) || 0;
                    };
                    const name = indexMap.name !== -1 ? columns[indexMap.name] : '';
                    const rawCost = indexMap.costUsd !== -1 ? columns[indexMap.costUsd] : '0';
                    const rawMargin = indexMap.margin !== -1 ? columns[indexMap.margin] : '30';
                    const code = indexMap.code !== -1 ? columns[indexMap.code] : `IMP-${Date.now()}-${idx}`;
                    const category = indexMap.category !== -1 ? columns[indexMap.category]?.split('|')[0] : '';

                    let margin = parseNumber(rawMargin);
                    if (margin > 1) margin = margin / 100;

                    return {
                        code,
                        name: name || `Producto Importado ${idx + 1}`,
                        costUsd: parseNumber(rawCost),
                        margin: margin || 0.30,
                        stock: 0,
                        isWeightable: false,
                        category
                    };
                }).filter(p => p.name && p.name !== '');

                if (productsToImport.length > 0 && window.confirm(`¿Deseas importar ${productsToImport.length} productos?`)) {
                    await apiService.products.bulkImport(productsToImport);
                    alert('¡Importación completada!');
                    fetchProducts();
                }
            } catch (err) {
                console.error('CSV import failed', err);
                alert('Error al procesar CSV.');
            } finally {
                setIsImporting(false);
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (!isModalOpen) return;
            const items = e.clipboardData?.items;
            if (items) {
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        const file = items[i].getAsFile();
                        if (file) handleFileUpload(file);
                    }
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [isModalOpen]);

    const getProductPricing = (costUsd: number, margin: number) => {
        const costBs = costUsd * personalRate;
        const calculatedDirectBsPrice = costBs * (1 + margin);
        const priceUsdOfficial = bcvRate > 0 ? calculatedDirectBsPrice / bcvRate : 0;
        const roundedPrecioBs = Math.round(calculatedDirectBsPrice / 10) * 10;
        return { costBs, calculatedDirectBsPrice, roundedPrecioBs, priceUsdOfficial };
    };

    const handleLocalUpdate = (id: number, updates: Partial<Product>) => {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    };

    const handleSaveUpdate = async (product: Product) => {
        try {
            await apiService.products.update(product.id, product);
        } catch (error) {
            console.error('Failed to save update', error);
            alert('Error al guardar los cambios');
            fetchProducts(); // Rollback to server state
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.includes(search)
    );

    return (
        <div className="p-8 max-w-[1700px] mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header removed as per user request */}

            {/* Actions Bar */}
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Filtrar por nombre, código o categoría..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[2rem] focus:ring-8 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all text-sm font-semibold text-slate-700 shadow-sm placeholder:text-slate-300"
                    />
                </div>
                
                <div className="flex gap-3">
                    <label className="cursor-pointer px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 shadow-sm">
                        <Upload size={18} />
                        {isImporting ? 'Importando...' : 'Importar CSV'}
                        <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} disabled={isImporting} />
                    </label>
                    
                    <div className="relative" ref={menuRef}>
                        <button 
                            onClick={() => setShowColumnMenu(!showColumnMenu)}
                            className={`p-4 rounded-2xl border transition-all ${showColumnMenu ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-100 text-slate-400 hover:text-blue-600 hover:shadow-md'}`}
                        >
                            <Settings2 size={20} />
                        </button>
                        
                        {showColumnMenu && (
                            <div className="absolute right-0 mt-3 w-64 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-6 z-50 animate-in slide-in-from-top-4 duration-200">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-3">Columnas Visibles</h4>
                                <div className="space-y-1">
                                    {defaultColumns.map(col => (
                                        <button
                                            key={col.id}
                                            disabled={col.id === 'product'}
                                            onClick={() => toggleColumn(col.id)}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                                                visibleColumns.includes(col.id) 
                                                ? 'bg-blue-50 text-blue-700' 
                                                : 'text-slate-400 hover:bg-slate-50'
                                            } ${col.id === 'product' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {col.label}
                                            {visibleColumns.includes(col.id) && <Check size={16} />}
                                        </button>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => setVisibleColumns(defaultColumns.filter(c => c.default).map(c => c.id))}
                                    className="w-full mt-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
                                >
                                    Restablecer
                                </button>
                            </div>
                        )}
                    </div>
 
                    <button
                        onClick={() => {
                            setNewProduct({ code: '', name: '', costUsd: 0, margin: 0.30, stock: 0, isWeightable: false, imageUrl: '' });
                            setIsModalOpen(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-blue-200 active:scale-95"
                    >
                        <Plus size={20} />
                        Añadir Producto
                    </button>
                </div>
            </div>
 
            {/* Excel-like Table */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden relative group/table">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 backdrop-blur-md border-b border-slate-300 sticky top-0 z-10">
                                <th className="w-16 pl-8 pr-2 py-6 border-r border-slate-300">
                                    <input type="checkbox" checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0} onChange={toggleSelectAll} className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer" />
                                </th>
                                {defaultColumns.filter(col => visibleColumns.includes(col.id)).map(col => (
                                    <th key={col.id} className={`px-4 py-6 border-r border-slate-300 last:border-r-0 ${col.id === 'product' ? 'min-w-[400px]' : col.id === 'code' ? 'w-32' : 'w-40'}`}>
                                        <div className={`flex items-center gap-2 ${col.id === 'product' ? 'justify-start' : 'justify-center'}`}>
                                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${col.id === 'priceBs' ? 'text-blue-600' : col.id === 'costBs' ? 'text-orange-600' : 'text-slate-400'}`}>
                                                {col.label}
                                            </span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                            {filteredProducts.map(product => {
                                const pricing = getProductPricing(product.costUsd || 0, product.margin || 0);
                                return (
                                    <tr key={product.id} className={`group hover:bg-blue-50/30 transition-all duration-150 border-b border-slate-300 ${selectedIds.includes(product.id) ? 'bg-blue-50/50' : ''}`}>
                                        <td className="pl-8 pr-2 py-5 border-r border-slate-300">
                                            <input type="checkbox" checked={selectedIds.includes(product.id)} onChange={() => toggleSelect(product.id)} className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer" />
                                        </td>
                                        {visibleColumns.includes('code') && <td className="px-4 py-5 font-mono text-[11px] text-slate-400 tracking-tight border-r border-slate-300">{product.code}</td>}
                                        {visibleColumns.includes('product') && (
                                            <td className="px-4 py-5 border-r border-slate-300">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center shrink-0 shadow-sm group-hover:shadow-md transition-all">
                                                        {product.imageUrl ? (
                                                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-500" />
                                                        ) : (
                                                            <Package size={24} className="text-slate-300" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <span className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors block leading-snug text-sm">
                                                            {product.name}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.includes('costUsd') && (
                                            <td className="px-4 py-5 font-black text-slate-600 font-mono tracking-tighter border-r border-slate-300">
                                                <div className="relative group/edit">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 text-xs">$</span>
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={product.costUsd}
                                                        onChange={(e) => handleLocalUpdate(product.id, { costUsd: parseFloat(e.target.value) || 0 })}
                                                        onBlur={() => handleSaveUpdate(product)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                (e.target as HTMLInputElement).blur();
                                                            }
                                                        }}
                                                        className="w-full pl-5 pr-2 py-1.5 bg-transparent group-hover/edit:bg-slate-100 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                                                    />
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.includes('costBs') && (
                                            <td className="px-4 py-5 border-r border-slate-300">
                                                <span className="font-black text-orange-600 font-mono text-sm tracking-tighter bg-orange-50 px-2 py-1 rounded-lg">
                                                    {Math.round((product.costUsd || 0) * personalRate).toLocaleString()} <small className="text-[10px] opacity-60">Bs</small>
                                                </span>
                                            </td>
                                        )}
                                        {visibleColumns.includes('margin') && (
                                            <td className="px-4 py-5 border-r border-slate-300">
                                                <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-[10px] font-black text-[10px] tracking-widest border border-slate-200/50">
                                                    {((product.margin || 0) * 100).toFixed(0)}%
                                                </span>
                                            </td>
                                        )}
                                        {visibleColumns.includes('priceBs') && (
                                            <td className="px-4 py-5 border-r border-slate-300">
                                                <div className="relative group/edit text-right">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-300 text-[10px] font-black">Bs.</span>
                                                    <input 
                                                        type="number" 
                                                        step="10"
                                                        value={Math.round(pricing.roundedPrecioBs)}
                                                        onChange={(e) => {
                                                            const newVal = parseFloat(e.target.value) || 0;
                                                            const costBs = (product.costUsd || 0) * personalRate;
                                                            const newMargin = costBs > 0 ? (newVal / costBs) - 1 : 0;
                                                            handleLocalUpdate(product.id, { margin: newMargin });
                                                        }}
                                                        onBlur={() => handleSaveUpdate(product)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                (e.target as HTMLInputElement).blur();
                                                            }
                                                        }}
                                                        className="w-full pl-8 pr-2 py-1.5 bg-transparent group-hover/edit:bg-blue-50 focus:bg-white text-right font-black text-slate-900 font-mono tracking-tighter rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                                                    />
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.includes('priceUsd') && (
                                            <td className="px-4 py-5 italic text-emerald-600 font-black font-mono text-sm tracking-tighter text-right border-r border-slate-300">
                                                ${pricing.priceUsdOfficial.toFixed(2)}
                                            </td>
                                        )}
                                        {visibleColumns.includes('stock') && (
                                            <td className="px-4 py-5 text-center border-r border-slate-300">
                                                <div className={`px-4 py-2 rounded-2xl text-[10px] font-black tracking-[0.1em] uppercase shadow-sm border ${
                                                    product.stock <= 0 ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                    product.stock <= 5 ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                }`}>
                                                    {product.stock} {product.isWeightable ? 'KG' : 'UND'}
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.includes('actions') && (
                                            <td className="px-4 py-5">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => { setNewProduct({ ...product }); setIsModalOpen(true); }} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-lg rounded-2xl transition-all border border-transparent hover:border-slate-100">
                                                        <Pencil size={18} />
                                                    </button>
                                                    <button onClick={() => handleDelete(product.id)} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-lg rounded-2xl transition-all border border-transparent hover:border-slate-100">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Redesign */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in zoom-in-95 duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden border border-slate-200">
                        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                                    {newProduct.id ? <Pencil size={24} /> : <Plus size={24} />}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{newProduct.id ? 'Editar' : 'Nuevo'} Producto</h3>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest opacity-60">Configuración Detallada</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-slate-200 text-slate-400 transition-colors">✕</button>
                        </div>
                        
                        <div className="p-10 space-y-8 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Código de Barras</label>
                                    <input type="text" autoComplete="new-password" name="prod_code_x" value={newProduct.code} onChange={e => setNewProduct({ ...newProduct, code: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 focus:border-blue-500 outline-none text-sm font-bold text-slate-700 transition-all shadow-inner" placeholder="Ejem: 7591234..." />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre Comercial</label>
                                    <input type="text" autoComplete="new-password" name="prod_name_x" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 focus:border-blue-500 outline-none text-sm font-bold text-slate-700 transition-all shadow-inner" placeholder="Nombre del producto..." />
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Costo $</label>
                                    <div className="relative group/field">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                        <input type="number" step="0.01" autoComplete="new-password" name="prod_cost_x" value={newProduct.costUsd} onChange={e => setNewProduct({ ...newProduct, costUsd: parseFloat(e.target.value) || 0 })} className="w-full pl-8 pr-4 py-4 bg-white border border-slate-200 rounded-2xl transition-all focus:ring-4 focus:ring-blue-50 font-mono font-black text-sm text-slate-800" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest px-1 text-center block">Costo Bs</label>
                                    <div className="px-4 py-4 bg-orange-50 rounded-2xl border border-orange-100 text-center">
                                        <span className="text-sm font-black text-orange-600 font-mono tracking-tighter">
                                            {Math.round((newProduct.costUsd || 0) * personalRate).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-1 block text-right">Precio Venta Bs (Sugerido)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 font-black">Bs.</span>
                                        <input
                                            type="number"
                                            step="10"
                                            autoComplete="new-password"
                                            value={Math.round(((newProduct.costUsd || 0) * personalRate * (1 + (newProduct.margin || 0))))}
                                            onChange={e => {
                                                const val = parseFloat(e.target.value) || 0;
                                                const costBs = (newProduct.costUsd || 0) * personalRate;
                                                setNewProduct({ ...newProduct, margin: costBs > 0 ? (val / costBs) - 1 : 0 });
                                            }}
                                            className="w-full pl-12 pr-6 py-4 bg-blue-50 border border-blue-100 rounded-2xl outline-none font-mono font-black text-blue-700 focus:ring-8 focus:ring-blue-100/50 transition-all text-xl text-right"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] flex items-center gap-6">
                                <div className="w-24 h-24 bg-white border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center shrink-0 relative group transition-all hover:border-blue-400">
                                    {newProduct.imageUrl ? (
                                        <img src={newProduct.imageUrl} alt="Preview" className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <Plus size={32} className="text-slate-300" />
                                    )}
                                    <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl cursor-pointer" />
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div className="flex gap-2">
                                        <label className="flex-1 text-center bg-white border border-slate-200 px-6 py-3 rounded-xl text-[10px] font-black text-slate-600 hover:bg-slate-50 cursor-pointer uppercase tracking-widest transition-all shadow-sm active:scale-95">
                                            Subir Foto
                                            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} className="hidden" />
                                        </label>
                                        <button onClick={() => setNewProduct({ ...newProduct, imageUrl: '' })} className="px-4 py-3 bg-rose-50 text-rose-500 rounded-xl border border-rose-100 hover:bg-rose-100 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <input type="text" placeholder="URL de imagen externa..." value={newProduct.imageUrl} onChange={e => setNewProduct({ ...newProduct, imageUrl: e.target.value })} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                        </div>

                        <div className="p-10 border-t border-slate-50 flex justify-end gap-4 bg-slate-50/50">
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-200 rounded-2xl transition-all">Cancelar</button>
                            <button onClick={async () => {
                                try {
                                    if ((newProduct as any).id) await apiService.products.update((newProduct as any).id, newProduct);
                                    else await apiService.products.create(newProduct as Omit<Product, 'id'>);
                                    setIsModalOpen(false); fetchProducts();
                                } catch (e) { alert('Error al guardar'); }
                            }} className="px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-95">
                                Finalizar y Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
