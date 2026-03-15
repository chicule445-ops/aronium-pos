import { Router } from 'express';
import { db } from '../db/index.js';
import { sales, saleItems, settings, products } from '../db/schema.js';

const router = Router();

router.get('/stats', async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const allSales = await db.select().from(sales);
        const todaysSales = allSales.filter(s => {
            const d = new Date(s.date);
            return d >= startOfDay && d <= endOfDay;
        });

        let todaySalesUsd = 0;
        let todaySalesBs = 0;
        let estimatedProfitUsd = 0;

        for (const sale of todaysSales) {
            todaySalesUsd += sale.totalUsd ?? 0;
            todaySalesBs += sale.totalBs ?? 0;
        }

        const allItems = await db.select().from(saleItems);
        const todaysSaleIds = new Set(todaysSales.map(s => s.id));
        const todaysItems = allItems.filter(i => todaysSaleIds.has(i.saleId));
        for (const item of todaysItems) {
            const revenue = (item.priceUsd ?? 0) * item.quantity;
            const cost = (item.costUsd ?? 0) * item.quantity;
            estimatedProfitUsd += revenue - cost;
        }

        const allSettings = await db.select().from(settings);
        const configObj = allSettings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {} as Record<string, number>);
        const bcvRate = configObj['exchange_rate_bcv'] || 1;
        const estimatedProfitBs = estimatedProfitUsd * bcvRate;

        const allProducts = await db.select().from(products);
        const lowStockItems = allProducts
            .filter(p => p.stock <= 5)
            .map(p => ({ id: p.id, name: p.name, stock: p.stock }));

        res.json({
            todaySalesUsd,
            todaySalesBs,
            todaySalesCount: todaysSales.length,
            estimatedProfitUsd,
            estimatedProfitBs,
            lowStockItems
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

export default router;
