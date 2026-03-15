import { useState, useEffect } from 'react';
import { ShoppingCart, Printer, Search, Calendar, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { apiService } from '../lib/api';
import type { Sale } from '../types';

interface SaleDetail extends Sale {
    items: {
        id: number;
        saleId: number;
        productId: number;
        productName: string;
        productCode: string;
        quantity: number;
        priceUsd: number;
        priceBs: number;
        costUsd: number;
    }[];
    payments: {
        id: number;
        method: string;
        amountUsd: number;
        amountBs: number;
    }[];
}

export function SalesHistory() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSale, setSelectedSale] = useState<SaleDetail | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        try {
            setLoading(true);
            const data = await apiService.sales.getAll();
            setSales(data);
        } catch (error) {
            console.error('Error fetching sales', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSaleDetails = async (id: number) => {
        try {
            const data = await apiService.sales.getById(id);
            setSelectedSale(data);
        } catch (error) {
            console.error('Error fetching sale details', error);
        }
    };

    const handlePrint = (sale: SaleDetail) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const dateStr = format(new Date(sale.date), "dd/MM/yyyy HH:mm");
        
        const html = `
            <html>
                <head>
                    <title>Ticket # ${sale.id}</title>
                    <style>
                        @page { margin: 0; }
                        body { 
                            width: 58mm; 
                            margin: 0; 
                            padding: 2mm; 
                            font-family: 'Courier New', Courier, monospace; 
                            font-size: 10px; 
                            line-height: 1.2;
                        }
                        .center { text-align: center; }
                        .bold { font-weight: bold; }
                        .divider { border-top: 1px dashed #000; margin: 2mm 0; }
                        table { width: 100%; border-collapse: collapse; }
                        .text-right { text-align: right; }
                        .item-row td { padding: 1mm 0; }
                        .total-row { font-size: 12px; font-weight: bold; }
                    </style>
                </head>
                <body onload="window.print(); window.close();">
                    <div class="center bold" style="font-size: 14px;">MI ARONIUM</div>
                    <div class="center">RIF: J-0000000-0</div>
                    <div class="divider"></div>
                    <div>TICKET: #${sale.id}</div>
                    <div>FECHA: ${dateStr}</div>
                    <div class="divider"></div>
                    <table>
                        <thead>
                            <tr class="bold">
                                <td>Cant</td>
                                <td>Prod</td>
                                <td class="text-right">Total</td>
                            </tr>
                        </thead>
                        <tbody>
                            ${sale.items.map(item => `
                                <tr class="item-row">
                                    <td>${item.quantity}</td>
                                    <td>${item.productName.substring(0, 15)}</td>
                                    <td class="text-right">${item.priceBs.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="divider"></div>
                    <div class="total-row">
                        <table style="margin-top: 2mm;">
                            <tr>
                                <td>TOTAL BS:</td>
                                <td class="text-right">${sale.totalBs.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>TOTAL USD:</td>
                                <td class="text-right">$${sale.totalUsd.toFixed(2)}</td>
                            </tr>
                        </table>
                    </div>
                    <div class="divider"></div>
                    <div class="bold">FORMA DE PAGO:</div>
                    <table>
                        ${sale.payments.map(p => `
                            <tr>
                                <td>${p.method.replace('_', ' ')}:</td>
                                <td class="text-right">${p.amountBs.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </table>
                    <div class="divider"></div>
                    <div class="center">¡Gracias por su compra!</div>
                    <div style="height: 10mm;"></div>
                </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const filteredSales = sales.filter(s => 
        s.id.toString().includes(searchTerm)
    );

    return (
        <div className="p-8 max-w-[1200px] mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Historial de Ventas</h1>
                    <p className="text-slate-500 mt-1 font-medium">Consulta y reimprime tus transacciones.</p>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por Ticket #"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-64"
                        />
                    </div>
                    <button onClick={fetchSales} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
                        <Calendar size={20} className="text-slate-600" />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">ID Ticket</th>
                            <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                            <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Total (Bs)</th>
                            <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Total (USD)</th>
                            <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-bold">Cargando ventas...</td></tr>
                        ) : filteredSales.length === 0 ? (
                            <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-bold">No se encontraron ventas.</td></tr>
                        ) : (
                            filteredSales.map(sale => (
                                <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-8 py-5 font-mono font-bold text-slate-700">#{sale.id}</td>
                                    <td className="px-8 py-5 text-slate-600 font-medium">
                                        {format(new Date(sale.date), "dd/MM/yyyy HH:mm", { locale: es })}
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className="font-black text-blue-600">Bs {sale.totalBs.toFixed(2)}</span>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className="font-bold text-emerald-600">${sale.totalUsd.toFixed(2)}</span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={async () => {
                                                    await fetchSaleDetails(sale.id);
                                                    // Need to wait for detail to be fetched, but state update is async
                                                    // For immediate print, we can use the data from the fetch directly
                                                    const data = await apiService.sales.getById(sale.id);
                                                    handlePrint(data);
                                                }}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Reimprimir Ticket"
                                            >
                                                <Printer size={18} />
                                            </button>
                                            <button 
                                                onClick={() => fetchSaleDetails(sale.id)}
                                                className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                                            >
                                                <ShoppingCart size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Sale Details Modal */}
            {selectedSale && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-2xl font-black text-slate-800">Ticket #{selectedSale.id}</h2>
                            <button onClick={() => setSelectedSale(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <ArrowLeft size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Resumen de Totales</p>
                                    <div className="mt-2 space-y-1">
                                        <p className="text-2xl font-black text-blue-600">Bs {selectedSale.totalBs.toFixed(2)}</p>
                                        <p className="text-lg font-bold text-emerald-600">${selectedSale.totalUsd.toFixed(2)}</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Fecha y Hora</p>
                                    <p className="mt-2 text-lg font-bold text-slate-700">
                                        {format(new Date(selectedSale.date), "PPP p", { locale: es })}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-widest">Productos</h3>
                                <div className="space-y-3">
                                    {selectedSale.items.map(item => (
                                        <div key={item.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-2xl">
                                            <div>
                                                <p className="font-bold text-slate-800">{item.productName}</p>
                                                <p className="text-xs font-mono text-slate-400">{item.productCode} x {item.quantity}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-slate-700">Bs {item.priceBs.toFixed(2)}</p>
                                                <p className="text-xs font-bold text-slate-400">${item.priceUsd.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-8 bg-slate-900 flex gap-4">
                            <button 
                                onClick={() => handlePrint(selectedSale)}
                                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-500 transition-colors"
                            >
                                <Printer size={20} />
                                REIMPRIMIR TICKET
                            </button>
                            <button 
                                onClick={() => setSelectedSale(null)}
                                className="px-8 py-4 bg-slate-800 text-slate-400 rounded-2xl font-black hover:bg-slate-700 transition-colors"
                            >
                                CERRAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
