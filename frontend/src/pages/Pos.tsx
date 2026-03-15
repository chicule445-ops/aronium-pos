import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, Trash2, CheckCircle2, X, Package, Printer } from 'lucide-react';
import { useRates } from '../context/RatesContext';
import { format } from 'date-fns';
import { apiService } from '../lib/api';
import type { Product, CartItem } from '../types';

export function Pos() {
    const { bcvRate, personalRate } = useRates();
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [search, setSearch] = useState('');

    // Resizable Layout State
    const [cartWidth, setCartWidth] = useState(450);
    const isResizing = useRef(false);

    const startResizing = useCallback(() => {
        isResizing.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'col-resize';
    }, []);

    const stopResizing = useCallback(() => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'default';
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing.current) return;
        setCartWidth(Math.max(300, Math.min(800, e.clientX - 256))); // Assumes sidebar is ~256
    }, []);

    // Payment Modal State
    const [showPayment, setShowPayment] = useState(false);
    const [lastSale, setLastSale] = useState<any>(null);
    const [paymentAmounts, setPaymentAmounts] = useState({
        CASH_USD: 0,
        CASH_BS: 0,
        PAGO_MOVIL: 0,
        DEBIT_BS: 0
    });

    useEffect(() => {
        fetchProducts();
        
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F2') {
                e.preventDefault();
                document.getElementById('pos-search')?.focus();
            }
            if (e.key === 'F10') {
                e.preventDefault();
                if (cart.length > 0) setShowPayment(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart.length]);

    const fetchProducts = async () => {
        try {
            const data = await apiService.products.getAll();
            setProducts(data);
        } catch (error) {
            console.error('Failed fetching products', error);
        }
    };

    const calculatePrices = useMemo(() => (costUsd: number, margin: number) => {
        const costBs = costUsd * personalRate;
        const directBsPrice = costBs * (1 + margin);
        const roundedPrecioBs = Math.round(directBsPrice / 10) * 10;
        const priceUsdOfficial = bcvRate > 0 ? directBsPrice / bcvRate : 0;
        return { roundedPrecioBs, priceUsdOfficial };
    }, [personalRate, bcvRate]);

    useEffect(() => {
        let barcodeBuffer = '';
        let timeoutId: ReturnType<typeof setTimeout>;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F10' && cart.length > 0 && !showPayment) {
                e.preventDefault();
                setShowPayment(true);
                return;
            }
            if (e.key === 'Escape' && showPayment) {
                e.preventDefault();
                setShowPayment(false);
                return;
            }
            if (e.key === 'F2') {
                e.preventDefault();
                document.getElementById('pos-search')?.focus();
                return;
            }
            if (e.target instanceof HTMLInputElement) return;

            if (e.key === 'Enter') {
                if (barcodeBuffer.length > 2) {
                    const matchedProduct = products.find(p => p.code === barcodeBuffer);
                    if (matchedProduct) addToCart(matchedProduct);
                }
                barcodeBuffer = '';
                return;
            }
            if (e.key.length === 1) {
                barcodeBuffer += e.key;
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => { barcodeBuffer = ''; }, 50);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            clearTimeout(timeoutId);
        };
    }, [products, cart.length, showPayment]);

    const addToCart = (product: Product) => {
        const pricing = calculatePrices(product.costUsd, product.margin);
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id
                    ? { ...item, cartQuantity: item.cartQuantity + 1 }
                    : item
                );
            }
            return [...prev, {
                ...product,
                cartQuantity: 1,
                finalPriceBs: pricing.roundedPrecioBs,
                finalPriceUsd: pricing.priceUsdOfficial
            }];
        });
    };

    const removeFromCart = (productId: number) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    const totalBs = cart.reduce((acc, item) => acc + (item.finalPriceBs * item.cartQuantity), 0);
    const totalUsd = cart.reduce((acc, item) => acc + (item.finalPriceUsd * item.cartQuantity), 0);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.includes(search)
    );

    const handlePrintReceipt = (sale: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const dateStr = format(new Date(sale.date || new Date()), "dd/MM/yyyy HH:mm");
        const html = `
            <html>
                <head>
                    <title>Ticket # ${sale.id}</title>
                    <style>
                        @page { margin: 0; }
                        body { width: 58mm; margin: 0; padding: 2mm; font-family: 'Courier New', Courier, monospace; font-size: 10px; line-height: 1.2; }
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
                            <tr class="bold"><td>Cant</td><td>Prod</td><td class="text-right">Total</td></tr>
                        </thead>
                        <tbody>
                            ${sale.items.map((item: any) => `
                                <tr class="item-row">
                                    <td>${item.quantity}</td>
                                    <td>${(item.productName || 'Producto').substring(0, 15)}</td>
                                    <td class="text-right">${(item.priceBs * item.quantity).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="divider"></div>
                    <div class="total-row">
                        <table style="margin-top: 2mm;">
                            <tr><td>TOTAL BS:</td><td class="text-right">${sale.totalBs.toFixed(2)}</td></tr>
                            <tr><td>TOTAL USD:</td><td class="text-right">$${sale.totalUsd.toFixed(2)}</td></tr>
                        </table>
                    </div>
                    <div class="divider"></div>
                    <div class="center">¡Gracias por su compra!</div>
                </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
            {/* Top Bar removed to reclaim space */}

            <div className="flex flex-1 overflow-hidden">
            {/* Left: Cart Area */}
            <div style={{ width: cartWidth }} className="bg-white border-r border-slate-200 shadow-xl flex flex-col z-20 relative">
                {/* Drag Handle */}
                <div 
                    onMouseDown={startResizing}
                    className="absolute right-0 top-0 bottom-0 w-1 hover:w-2 bg-transparent hover:bg-blue-400 cursor-col-resize z-50 transition-all"
                />

                {/* Header: Action Buttons removed as per user request */}

                <div className="flex-1 overflow-y-auto bg-white">
                    <div className="divide-y divide-slate-100">
                        {cart.map(item => (
                            <div key={item.id} className="px-6 py-4 hover:bg-slate-50 transition-all flex justify-between items-center group">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-slate-700 truncate">{item.name}</h4>
                                    <div className="flex items-center gap-4 mt-1">
                                        <span className="text-xs text-slate-400 font-mono">{item.cartQuantity} x {item.finalPriceBs.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="text-right ml-4">
                                    <span className="font-bold text-slate-900 font-mono">{(item.cartQuantity * item.finalPriceBs).toFixed(2)}</span>
                                </div>
                                <button onClick={() => removeFromCart(item.id)} className="ml-4 p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                    {cart.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                            <p className="font-medium text-lg">No hay artículos</p>
                        </div>
                    )}
                </div>

                <div className="border-t border-slate-200 bg-slate-50/30">
                    <div className="p-4 space-y-1.5">
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>Subtotal</span>
                            <span className="font-mono">{totalBs.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>Impuestos</span>
                            <span className="font-mono">0.00</span>
                        </div>
                        <div className="flex justify-between items-end pt-3 border-t border-slate-200/50 border-dashed">
                            <span className="text-sm font-black text-slate-900 uppercase tracking-tighter">TOTAL</span>
                            <span className="text-xl font-black text-slate-900 font-mono tracking-tighter">{totalBs.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 border-t border-slate-200">
                        <button 
                            onClick={() => setCart([])}
                            disabled={cart.length === 0}
                            className="py-3 flex flex-col items-center justify-center gap-0.5 bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 transition-all"
                        >
                            <Trash2 size={18} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/90">Anular Venta</span>
                        </button>
                    </div>

                    <button 
                        onClick={() => setShowPayment(true)} 
                        disabled={cart.length === 0} 
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-lg py-4 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 shadow-[0_-4px_20px_rgba(37,99,235,0.15)]"
                    >
                        <div className="px-2 py-0.5 bg-white/20 rounded text-[10px] border border-white/10">F10</div>
                        PAGO
                    </button>
                </div>
            </div>

            {/* Right: Product Grid */}
            <div className="flex-1 flex flex-col h-full">
                <div className="p-4 bg-white border-b border-slate-200 flex items-center shadow-sm">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={20} />
                        <input id="pos-search" type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Busca productos por nombre, código o barra..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-slate-700" autoFocus />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                        {filteredProducts.map(product => {
                            const pricing = calculatePrices(product.costUsd, product.margin);
                            return (
                                <button key={product.id} onClick={() => addToCart(product)} className="bg-white rounded-[2.5rem] p-6 flex flex-col h-64 border border-slate-100 hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-900/10 transition-all text-left group relative overflow-hidden active:scale-95 shadow-sm">
                                    <div className="h-32 bg-slate-50 rounded-3xl mb-4 overflow-hidden relative border border-slate-100">
                                        {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-500" /> : <Package size={32} className="text-slate-200 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-slate-800 leading-tight line-clamp-2 text-sm group-hover:text-blue-600 transition-colors">{product.name}</h3>
                                        <div className="mt-3 flex justify-between items-end border-t border-slate-50 pt-3">
                                            <span className="font-black text-xl text-emerald-600 font-mono tracking-tighter">{pricing.roundedPrecioBs.toLocaleString()} <small className="text-[10px] font-normal opacity-50">Bs</small></span>
                                            <span className="text-[10px] font-bold text-slate-400 italic">${pricing.priceUsdOfficial.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Payment Modal Reused with Styles */}
            {showPayment && (() => {
                const totalPaidBs = paymentAmounts.CASH_BS + paymentAmounts.PAGO_MOVIL + paymentAmounts.DEBIT_BS + (paymentAmounts.CASH_USD * bcvRate);
                const remainingBs = totalBs - totalPaidBs;
                return (
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Procesar Venta</h2>
                            <button onClick={() => setShowPayment(false)} className="w-10 h-10 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all active:scale-90"><X size={20} /></button>
                        </div>
                        <div className="p-10 flex gap-10 overflow-y-auto">
                            <div className="flex-1 space-y-8">
                                {/* Botones de Pago Rápido */}
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setPaymentAmounts({ CASH_USD: 0, CASH_BS: Number(totalBs.toFixed(2)), PAGO_MOVIL: 0, DEBIT_BS: 0 })}
                                        className="py-4 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-black text-sm uppercase tracking-wider transition-all border border-blue-200 flex flex-col items-center justify-center gap-1 active:scale-95"
                                    >
                                        <span>Todo Efectivo</span>
                                        <span className="text-xs opacity-80">Bs</span>
                                    </button>
                                    <button
                                        onClick={() => setPaymentAmounts({ CASH_USD: Number(totalUsd.toFixed(2)), CASH_BS: 0, PAGO_MOVIL: 0, DEBIT_BS: 0 })}
                                        className="py-4 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl font-black text-sm uppercase tracking-wider transition-all border border-emerald-200 flex flex-col items-center justify-center gap-1 active:scale-95"
                                    >
                                        <span>Todo Efectivo</span>
                                        <span className="text-xs opacity-80">$</span>
                                    </button>
                                    <button
                                        onClick={() => setPaymentAmounts({ CASH_USD: 0, CASH_BS: 0, PAGO_MOVIL: Number(totalBs.toFixed(2)), DEBIT_BS: 0 })}
                                        className="py-4 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl font-black text-sm uppercase tracking-wider transition-all border border-purple-200 flex flex-col items-center justify-center gap-1 active:scale-95"
                                    >
                                        <span>Todo</span>
                                        <span className="text-xs opacity-80">Pago Móvil</span>
                                    </button>
                                    <button
                                        onClick={() => setPaymentAmounts({ CASH_USD: 0, CASH_BS: 0, PAGO_MOVIL: 0, DEBIT_BS: Number(totalBs.toFixed(2)) })}
                                        className="py-4 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-xl font-black text-sm uppercase tracking-wider transition-all border border-orange-200 flex flex-col items-center justify-center gap-1 active:scale-95"
                                    >
                                        <span>Todo</span>
                                        <span className="text-xs opacity-80">Débito / Punto</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] px-2">Efectivo $Dólares</label>
                                        <input type="number" value={paymentAmounts.CASH_USD || ''} onChange={e => setPaymentAmounts(p => ({ ...p, CASH_USD: parseFloat(e.target.value) || 0 }))} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 font-black text-xl text-emerald-700 font-mono transition-all shadow-inner" placeholder="0.00" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] px-2">Efectivo Bolívares</label>
                                        <input type="number" value={paymentAmounts.CASH_BS || ''} onChange={e => setPaymentAmounts(p => ({ ...p, CASH_BS: parseFloat(e.target.value) || 0 }))} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 font-black text-xl text-blue-700 font-mono transition-all shadow-inner" placeholder="0.00" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-purple-600 uppercase tracking-[0.2em] px-2">Pago Móvil</label>
                                        <input type="number" value={paymentAmounts.PAGO_MOVIL || ''} onChange={e => setPaymentAmounts(p => ({ ...p, PAGO_MOVIL: parseFloat(e.target.value) || 0 }))} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-purple-50 focus:border-purple-500 font-black text-xl text-purple-700 font-mono transition-all shadow-inner" placeholder="0.00" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] px-2">Punto de Venta</label>
                                        <input type="number" value={paymentAmounts.DEBIT_BS || ''} onChange={e => setPaymentAmounts(p => ({ ...p, DEBIT_BS: parseFloat(e.target.value) || 0 }))} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-orange-50 focus:border-orange-500 font-black text-xl text-orange-700 font-mono transition-all shadow-inner" placeholder="0.00" />
                                    </div>
                                </div>
                            </div>
                            <div className="w-80 space-y-6">
                                <div className="p-6 bg-slate-900 rounded-2xl text-white shadow-xl">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 block text-center">Total Venta</span>
                                    <p className="text-3xl font-black text-center font-mono tracking-tighter mb-1">Bs {totalBs.toFixed(2)}</p>
                                    <p className="text-sm font-bold text-center text-slate-400 font-mono italic">${totalUsd.toFixed(2)}</p>
                                </div>
                                <div className={`p-6 rounded-2xl border-2 text-center transition-all ${remainingBs > 0.01 ? 'bg-orange-50 border-orange-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 block">{remainingBs > 0.01 ? 'Pendiente' : 'Cambio'}</span>
                                    <p className={`text-2xl font-black font-mono ${remainingBs > 0.01 ? 'text-orange-600' : 'text-emerald-600'}`}>Bs {Math.abs(remainingBs).toFixed(2)}</p>
                                </div>
                                <button onClick={async () => {
                                    try {
                                        const saleData = {
                                            items: cart.map(item => ({
                                                productId: item.id,
                                                quantity: item.cartQuantity,
                                                priceUsd: item.finalPriceUsd,
                                                priceBs: item.finalPriceBs,
                                                costUsd: item.costUsd
                                            })),
                                            payments: [
                                                { method: 'CASH_USD', amountUsd: paymentAmounts.CASH_USD, amountBs: paymentAmounts.CASH_USD * bcvRate },
                                                { method: 'CASH_BS', amountUsd: paymentAmounts.CASH_BS / bcvRate, amountBs: paymentAmounts.CASH_BS },
                                                { method: 'PAGO_MOVIL', amountUsd: paymentAmounts.PAGO_MOVIL / bcvRate, amountBs: paymentAmounts.PAGO_MOVIL },
                                                { method: 'DEBIT_BS', amountUsd: paymentAmounts.DEBIT_BS / bcvRate, amountBs: paymentAmounts.DEBIT_BS }
                                            ].filter(p => p.amountBs > 0 || p.amountUsd > 0),
                                            totalUsd,
                                            totalBs,
                                            exchangeRateBcv: bcvRate,
                                            exchangeRatePersonal: personalRate
                                        };

                                        const response = await apiService.sales.create(saleData);
                                        if (response.success) {
                                            setLastSale(response.sale);
                                            setCart([]);
                                            setShowPayment(false);
                                            setPaymentAmounts({
                                                CASH_USD: 0,
                                                CASH_BS: 0,
                                                PAGO_MOVIL: 0,
                                                DEBIT_BS: 0
                                            });
                                        }
                                    } catch (error) {
                                        console.error('Error al finalizar venta:', error);
                                        alert('Error al procesar la venta. Por favor intente de nuevo.');
                                    }
                                }} disabled={remainingBs > 0.01} className="w-full bg-slate-900 hover:bg-black text-white py-6 rounded-2xl text-xl font-black transition-all shadow-xl active:scale-95 disabled:opacity-20 flex items-center justify-center gap-4">
                                    FINALIZAR
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                );
            })()}

            {/* Success Print Receipt Reused */}
            {lastSale && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl p-10 text-center space-y-8 border border-slate-100">
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-100 animate-bounce">
                            <CheckCircle2 size={40} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tighter">¡Venta Exitosa!</h2>
                            <p className="text-slate-400 mt-1 font-bold uppercase tracking-widest text-[10px]">Cierre de operación satisfactorio</p>
                        </div>
                        <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                             <p className="text-3xl font-black text-blue-600 font-mono tracking-tighter mb-1">Bs {lastSale.totalBs.toFixed(2)}</p>
                             <p className="text-lg font-black text-emerald-500 font-mono italic opacity-60">${lastSale.totalUsd.toFixed(2)}</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => handlePrintReceipt(lastSale)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl text-lg flex justify-center items-center gap-3 transition-all shadow-xl shadow-blue-200 active:scale-95">
                                <Printer size={24} />
                                IMPRIMIR TICKET
                            </button>
                            <button onClick={() => setLastSale(null)} className="w-full py-2 text-slate-400 font-black hover:text-slate-900 transition-colors uppercase tracking-[0.2em] text-[10px]">Nueva Transacción</button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}
