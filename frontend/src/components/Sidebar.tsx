import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Settings, TrendingUp, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRates } from '../context/RatesContext';

export function Sidebar({ onToggle }: { onToggle?: (width: number) => void }) {
    const { bcvRate, personalRate } = useRates();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        if (onToggle) {
            onToggle(newState ? 80 : 256);
        }
    };

    const navItems = [
        { to: '/', icon: LayoutDashboard, label: 'Panel' },
        { to: '/pos', icon: ShoppingCart, label: 'Caja / POS' },
        { to: '/inventory', icon: Package, label: 'Inventario' },
        { to: '/history', icon: TrendingUp, label: 'Historial' },
        { to: '/settings', icon: Settings, label: 'Configuración' },
    ];

    return (
        <aside className={`${isCollapsed ? 'w-20' : 'w-full'} h-full bg-[#0F172A] text-slate-300 flex flex-col border-r border-slate-800 shadow-2xl z-20 px-2 relative`}>
            {/* Toggle Button */}
            <button 
                onClick={toggleSidebar}
                className="absolute -right-3 top-24 w-6 h-12 bg-blue-600 text-white rounded-r-xl flex items-center justify-center shadow-xl hover:bg-blue-500 transition-all z-50 border border-blue-400/20 hover:scale-105 active:scale-95 group/toggle"
            >
                {isCollapsed ? <ChevronRight size={14} className="group-hover/toggle:translate-x-0.5 transition-transform" /> : <ChevronLeft size={14} className="group-hover/toggle:-translate-x-0.5 transition-transform" />}
            </button>

            <div className={`p-6 ${isCollapsed ? 'items-center px-0' : ''} flex flex-col`}>
                <div className={`flex items-center ${isCollapsed ? 'justify-center w-12 h-12 p-0' : 'gap-3 p-4'} bg-slate-900/50 rounded-2xl border border-slate-700/30 transition-all`}>
                    <h1 className="text-2xl font-black text-white tracking-tighter flex items-center gap-2">
                        <span className="bg-gradient-to-br from-blue-500 to-indigo-600 px-3 py-1 rounded-xl shadow-lg shadow-blue-500/20">
                            {isCollapsed ? 'P' : 'POS'}
                        </span>
                        {!isCollapsed && <span className="text-blue-50">PRO</span>}
                    </h1>
                </div>
                {!isCollapsed && <p className="text-[10px] font-black text-slate-500 mt-4 px-4 tracking-[0.3em] uppercase opacity-70">SISTEMA MULTIMONEDA</p>}
            </div>

            <nav className="flex-1 px-4 mt-4 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 font-semibold group ${isActive
                                ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
                                : 'hover:bg-slate-800/50 hover:text-white'
                            }`
                        }
                    >
                        <item.icon size={20} className="group-hover:scale-110 transition-transform shrink-0" />
                        {!isCollapsed && <span className="text-sm whitespace-nowrap">{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            <div className={`p-6 border-t border-slate-800 bg-slate-950/20 ${isCollapsed ? 'px-2' : ''}`}>
                <div className="space-y-4">
                    <div className="flex flex-col gap-3">
                        <div className={`flex items-center ${isCollapsed ? 'justify-center p-2' : 'justify-between p-3'} rounded-xl bg-slate-800/30 border border-slate-700/50`}>
                            <div className="flex items-center gap-2">
                                <TrendingUp size={14} className="text-emerald-400" />
                                {!isCollapsed && <span className="text-[10px] font-bold text-slate-500 uppercase">BCV</span>}
                            </div>
                            {!isCollapsed && (
                                <span className="text-sm font-black text-emerald-400 font-mono">
                                    {bcvRate > 0 ? bcvRate.toFixed(2) : '--.--'} <small className="text-[9px] opacity-70">Bs</small>
                                </span>
                            )}
                        </div>
                        <div className={`flex items-center ${isCollapsed ? 'justify-center p-2' : 'justify-between p-3'} rounded-xl bg-slate-800/30 border border-slate-700/50`}>
                            <div className="flex items-center gap-2">
                                <DollarSign size={14} className="text-blue-400" />
                                {!isCollapsed && <span className="text-[10px] font-bold text-slate-500 uppercase">Personal</span>}
                            </div>
                            {!isCollapsed && (
                                <span className="text-sm font-black text-blue-400 font-mono">
                                    {personalRate > 0 ? personalRate.toFixed(2) : '--.--'} <small className="text-[9px] opacity-70">Bs</small>
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
