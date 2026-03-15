import { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, DollarSign, PackageX, Activity, BarChart3, AlertCircle, Layers, ArrowUpRight } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

interface DashboardStats {
    todaySalesUsd: number;
    todaySalesBs: number;
    todaySalesCount: number;
    estimatedProfitUsd: number;
    estimatedProfitBs: number;
    lowStockItems: { id: number; name: string; stock: number }[];
}

const EMPTY_STATS = {
    todaySalesUsd: 0,
    todaySalesBs: 0,
    todaySalesCount: 0,
    estimatedProfitUsd: 0,
    estimatedProfitBs: 0,
    lowStockItems: [] as { id: number; name: string; stock: number }[]
};

export function Dashboard() {
    const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setError(null);
            const res = await axios.get(`${API_URL}/dashboard/stats`);
            setStats({ ...EMPTY_STATS, ...res.data });
        } catch (err) {
            console.error('Failed to fetch stats', err);
            setError('No se pudo conectar con el servidor.');
        }
    };

    if (error) return (
        <div className="p-8 flex items-center justify-center h-full">
            <div className="bg-white border border-rose-100 p-12 rounded-[3.5rem] shadow-2xl shadow-rose-200/50 text-center max-w-lg animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <AlertCircle size={48} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Error de Conexión</h2>
                <p className="text-slate-500 mb-10 leading-relaxed font-medium">Parece que el servidor central está fuera de línea. Por favor, verifica tu conexión o reinicia el backend.</p>
                <button onClick={fetchStats} className="w-full py-5 bg-rose-600 hover:bg-rose-700 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-rose-200 active:scale-95">
                    Reintentar Conexión
                </button>
            </div>
        </div>
    );

    return (
        <div className="p-10 max-w-[1700px] mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-4">
                        <BarChart3 className="text-blue-600" size={32} />
                        Métricas de Hoy
                    </h1>
                    <p className="text-slate-400 mt-2 font-semibold text-base flex items-center gap-2">
                        Estado operativo y financiero consolidado en tiempo real.
                    </p>
                </div>
                <div className="px-6 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <Activity className="text-emerald-500" size={20} />
                    <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Sistema En Línea</span>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                {/* Sales Card */}
                <div className="group bg-white p-8 rounded-[2rem] shadow-2xl shadow-slate-200 border border-slate-50 hover:shadow-emerald-900/5 transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-[4rem] -mr-8 -mt-8 transition-all group-hover:scale-110" />
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 mb-6 group-hover:scale-110 transition-transform">
                            <DollarSign size={24} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Facturación Bruta</p>
                        <h3 className="text-2xl font-black text-slate-900 mt-2 font-mono tracking-tighter">${stats.todaySalesUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                        <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between items-center group-hover:border-emerald-100 transition-colors">
                            <span className="text-[11px] font-black text-emerald-600 font-mono italic">≈ Bs {stats.todaySalesBs.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            <ArrowUpRight size={18} className="text-emerald-200" />
                        </div>
                    </div>
                </div>

                {/* Profit Card */}
                <div className="group bg-slate-950 p-8 rounded-[2rem] shadow-2xl shadow-blue-900/10 border border-slate-800 hover:shadow-blue-500/10 transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-[4rem] -mr-8 -mt-8 transition-all group-hover:scale-110" />
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6 group-hover:scale-110 transition-transform">
                            <TrendingUp size={24} />
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Utilidad Estimada</p>
                        <h3 className="text-2xl font-black text-white mt-2 font-mono tracking-tighter">${stats.estimatedProfitUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                        <div className="mt-6 pt-6 border-t border-slate-800 flex justify-between items-center group-hover:border-blue-500/30 transition-colors">
                            <span className="text-[11px] font-black text-blue-400 font-mono italic">+ Bs {stats.estimatedProfitBs.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            <ArrowUpRight size={18} className="text-blue-900" />
                        </div>
                    </div>
                </div>

                {/* Transactions Card */}
                <div className="group bg-white p-8 rounded-[2rem] shadow-2xl shadow-slate-200 border border-slate-50 hover:shadow-purple-900/5 transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-[4rem] -mr-8 -mt-8 transition-all group-hover:scale-110" />
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center shadow-sm mb-6 group-hover:scale-110 transition-transform">
                            <span className="text-2xl font-black">{stats.todaySalesCount}</span>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Movimientos</p>
                        <h3 className="text-2xl font-black text-slate-900 mt-2 tracking-tighter">Ventas <small className="text-xs font-bold opacity-30">Hoy</small></h3>
                        <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Flujo de Caja Activo</span>
                        </div>
                    </div>
                </div>

                {/* Inventory Alert Card */}
                <div className={`group p-8 rounded-[2rem] shadow-2xl border transition-all relative overflow-hidden ${stats.lowStockItems.length > 0 ? 'bg-rose-50 border-rose-100 shadow-rose-200/50' : 'bg-white border-slate-50 shadow-slate-200'}`}>
                    <div className="relative z-10">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg mb-6 transition-transform group-hover:scale-110 ${stats.lowStockItems.length > 0 ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-slate-100 text-slate-400 shadow-slate-100'}`}>
                            <PackageX size={24} />
                        </div>
                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${stats.lowStockItems.length > 0 ? 'text-rose-400' : 'text-slate-400'}`}>Stock Crítico</p>
                        <h3 className={`text-2xl font-black mt-2 tracking-tighter ${stats.lowStockItems.length > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{stats.lowStockItems.length} SKUs</h3>
                        <div className={`mt-6 pt-6 border-t flex justify-between items-center ${stats.lowStockItems.length > 0 ? 'border-rose-100' : 'border-slate-50'}`}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stats.lowStockItems.length > 0 ? 'Requiere Reposición' : 'Nivel Saludable'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alert Table / Watchlist */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-50 overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex items-center gap-6 bg-slate-50/30">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 border border-slate-100">
                            <Layers size={21} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Vigilancia de Inventario</h3>
                            <p className="text-slate-400 font-semibold text-sm">Productos con existencias por debajo del umbral mínimo.</p>
                        </div>
                    </div>
                    <div className="p-4">
                        {stats.lowStockItems.length > 0 ? (
                            <div className="space-y-3">
                                {stats.lowStockItems.map(item => (
                                    <div key={item.id} className="p-6 bg-white hover:bg-slate-50 border border-slate-50 hover:border-slate-100 rounded-3xl flex justify-between items-center transition-all group">
                                        <div className="flex items-center gap-5">
                                            <div className="w-3 h-3 rounded-full bg-rose-500 shadow-lg shadow-rose-200 animate-pulse" />
                                            <span className="font-black text-slate-700 text-lg group-hover:text-slate-900">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="px-5 py-2.5 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs uppercase tracking-widest border border-rose-100">
                                                Saldo: {item.stock}
                                            </span>
                                            <div className="w-10 h-10 flex items-center justify-center text-slate-200 group-hover:text-blue-500 transition-colors">
                                                <ArrowUpRight size={20} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 flex flex-col items-center justify-center opacity-30">
                                <Activity size={64} className="text-slate-200 mb-4" />
                                <p className="font-black uppercase tracking-widest text-xs text-slate-400">Sin Alertas Pendientes</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Side Card */}
                <div className="bg-slate-950 rounded-[2rem] p-10 text-white shadow-2xl shadow-blue-900/20 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32" />
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black tracking-tighter mb-4">Resumen Estratégico</h3>
                        <p className="text-slate-400 leading-relaxed font-medium mb-10 text-lg">
                            Tu inventario está optimizado al <strong className="text-blue-400">92%</strong> de su capacidad máxima histórica. 
                        </p>
                        <div className="space-y-6">
                            <div className="flex justify-between items-center py-4 border-b border-slate-800">
                                <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Rotación SKU</span>
                                <span className="text-xl font-black text-white font-mono">High</span>
                            </div>
                            <div className="flex justify-between items-center py-4 border-b border-slate-800">
                                <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Margen Promedio</span>
                                <span className="text-xl font-black text-emerald-400 font-mono">31.4%</span>
                            </div>
                        </div>
                    </div>
                    <div className="relative z-10 mt-12">
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="w-3/4 h-full bg-blue-500 rounded-full shadow-lg shadow-blue-500/50" />
                        </div>
                        <p className="mt-4 text-[10px] font-black uppercase text-slate-600 tracking-[0.3em]">Crecimiento Mensual Est.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
