export interface Product {
    id: number;
    code: string;
    name: string;
    costUsd: number;
    margin: number;
    stock: number;
    isWeightable: boolean;
    imageUrl?: string;
    category?: string;
}

export interface CartItem extends Product {
    cartQuantity: number;
    finalPriceBs: number;
    finalPriceUsd: number;
}

export interface PaymentAmount {
    id?: number;
    method: 'CASH_USD' | 'CASH_BS' | 'PAGO_MOVIL' | 'DEBIT_BS' | string;
    amountUsd: number;
    amountBs: number;
}

export interface Sale {
    id: number;
    totalUsd: number;
    totalBs: number;
    exchangeRateBcv: number;
    exchangeRatePersonal: number;
    date: string;
    status?: string;
    items: SaleItem[];
    payments: PaymentAmount[];
    profitUsd?: number;
}

export interface SaleItem {
    id: number;
    saleId: number;
    productId: number;
    productName?: string;
    productCode?: string;
    quantity: number;
    priceUsd: number;
    priceBs: number;
    costUsd: number;
}

export interface SystemConfig {
    exchange_rate_bcv?: number;
    exchange_rate_personal?: number;
    [key: string]: any;
}
