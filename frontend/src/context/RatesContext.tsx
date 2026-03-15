import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

interface RatesContextType {
    bcvRate: number;
    personalRate: number;
    loading: boolean;
    refreshRates: () => Promise<void>;
}

const RatesContext = createContext<RatesContextType | undefined>(undefined);

export function RatesProvider({ children }: { children: ReactNode }) {
    const [bcvRate, setBcvRate] = useState<number>(0);
    const [personalRate, setPersonalRate] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const refreshRates = async () => {
        try {
            const res = await axios.get(`${API_URL}/config`);
            setBcvRate(res.data.exchange_rate_bcv || 0);
            setPersonalRate(res.data.exchange_rate_personal || 0);
        } catch (error) {
            console.error('Failed to fetch rates', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshRates();
        // Refresh rates every 5 minutes
        const interval = setInterval(refreshRates, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <RatesContext.Provider value={{ bcvRate, personalRate, loading, refreshRates }}>
            {children}
        </RatesContext.Provider>
    );
}

export function useRates() {
    const context = useContext(RatesContext);
    if (context === undefined) {
        throw new Error('useRates must be used within a RatesProvider');
    }
    return context;
}
