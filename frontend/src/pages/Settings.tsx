import { useState, useEffect } from 'react';
import { Save, RefreshCw, Smartphone, Globe, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useRates } from '../context/RatesContext';
import { apiService } from '../lib/api';

export function Settings() {
    const { refreshRates } = useRates();
    const [bcvRate, setBcvRate] = useState<string>('');
    const [personalRate, setPersonalRate] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | null }>({ text: '', type: null });

    useEffect(() => {
        fetchRates();
    }, []);

    const fetchRates = async () => {
        setIsLoading(true);
        try {
            const data = await apiService.config.get();
            setBcvRate(data.exchange_rate_bcv?.toString() || '');
            setPersonalRate(data.exchange_rate_personal?.toString() || '');
        } catch (error) {
            console.error(error);
            setMessage({ text: 'Error al cargar la configuración.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (key: string, value: string) => {
        if (!value || isNaN(parseFloat(value))) return;
        setIsSaving(true);
        setMessage({ text: '', type: null });
        try {
            await apiService.config.update(key, parseFloat(value));
            await refreshRates();
            setMessage({ text: 'Tasa actualizada y sincronizada en todo el sistema.', type: 'success' });
            setTimeout(() => setMessage({ text: '', type: null }), 4000);
        } catch (error) {
            console.error(error);
            setMessage({ text: 'Error al guardar la tasa.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center h-full gap-4">
                <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Cargando Configuración...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1200px] mx-auto space-y-10">
            <div>
                <h1 className="text-4xl font-black text-slate-800 tracking-tight">Configuración Global</h1>
                <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
                    <Globe size={18} className="text-blue-500" />
                    Administra los parámetros críticos que afectan los cálculos de precios en todo el sistema.
                </p>
            </div>

            {message.text && (
                <div className={`p-6 rounded-[2rem] border flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-xl shadow-slate-100 ${message.type === 'error'
                    ? 'bg-rose-50 border-rose-100 text-rose-700'
                    : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    }`}>
                    {message.type === 'error' ? <AlertCircle className="shrink-0" /> : <CheckCircle2 className="shrink-0" />}
                    <span className="font-bold text-sm tracking-tight">{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Tasa BCV Card */}
                <div 
                    style={{ resize: 'both', overflow: 'auto', minWidth: '300px', minHeight: '400px' }}
                    className="group bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 transition-all hover:shadow-emerald-900/5 relative"
                >
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-inner">
                            <Smartphone size={28} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800">Tasa Oficial (BCV)</h2>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Conversión Divisas</span>
                        </div>
                    </div>

                    <p className="text-slate-500 text-sm leading-relaxed mb-8 font-medium">
                        Esta tasa se utiliza como divisor para convertir tus precios en Bolívares al monto real guardado en Dólares ($). Afecta el POS y Reportes.
                    </p>

                    <div className="space-y-4">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Tasa Vigente (Bs)</label>
                        <div className="flex gap-4">
                            <div className="relative flex-1">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-black text-lg">Bs.</span>
                                <input
                                    id="fld_main_ex_rate"
                                    name="fld_main_ex_rate_x"
                                    type="number"
                                    step="0.01"
                                    autoComplete="new-password"
                                    className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 outline-none transition-all font-mono text-xl font-black text-slate-800 shadow-inner"
                                    value={bcvRate}
                                    onChange={(e) => setBcvRate(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => handleSave('exchange_rate_bcv', bcvRate)}
                            disabled={isSaving}
                            className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                        >
                            <Save size={18} />
                            Actualizar Tasa BCV
                        </button>
                    </div>
                </div>

                {/* Tasa Personal Card */}
                <div 
                    style={{ resize: 'both', overflow: 'auto', minWidth: '300px', minHeight: '400px' }}
                    className="group bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 transition-all hover:shadow-blue-900/5 relative"
                >
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                            <RefreshCw size={28} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800">Tasa Personal</h2>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Costo Estratégico</span>
                        </div>
                    </div>

                    <p className="text-slate-500 text-sm leading-relaxed mb-8 font-medium">
                        Esta tasa se utiliza para calcular tu <strong className="text-slate-800">Costo Real</strong> en Bolívares al momento de registrar compras y gestionar márgenes de ganancia.
                    </p>

                    <div className="space-y-4">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Tasa Ajustada (Bs)</label>
                        <div className="flex gap-4">
                            <div className="relative flex-1">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-black text-lg">Bs.</span>
                                <input
                                    id="fld_strat_rate"
                                    name="fld_strat_rate_x"
                                    type="number"
                                    step="0.01"
                                    autoComplete="new-password"
                                    className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-mono text-xl font-black text-slate-800 shadow-inner"
                                    value={personalRate}
                                    onChange={(e) => setPersonalRate(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => handleSave('exchange_rate_personal', personalRate)}
                            disabled={isSaving}
                            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50"
                        >
                            <Save size={18} />
                            Actualizar Tasa Personal
                        </button>
                    </div>
                </div>
            </div>

            <div 
                style={{ resize: 'vertical', overflow: 'auto', minHeight: '200px' }}
                className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-blue-900/10 border border-slate-800"
            >
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black tracking-tight">Sincronización Inteligente</h3>
                        <p className="text-slate-400 font-medium max-w-lg">
                            Cualquier cambio realizado aquí se aplicará de forma instantánea en el terminal de venta (POS) y en la gestión de inventario, asegurando que tus márgenes estén siempre protegidos.
                        </p>
                    </div>
                    <div className="flex gap-4 shrink-0">
                        <div className="px-6 py-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                            <div className="text-xs font-black text-slate-500 uppercase mb-1">POS</div>
                            <div className="text-emerald-400 font-black">ACTIVO</div>
                        </div>
                        <div className="px-6 py-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                            <div className="text-xs font-black text-slate-500 uppercase mb-1">API</div>
                            <div className="text-blue-400 font-black">ONLINE</div>
                        </div>
                    </div>
                </div>
                <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -z-0"></div>
            </div>
        </div>
    );
}
