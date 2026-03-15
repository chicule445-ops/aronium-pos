import { Router } from 'express';
import { db } from '../db/index.js';
import { sales, saleItems, inventoryMovements, products, payments } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

const router = Router();

router.post('/', async (req, res) => {
    try {
        const { items, payments: paymentList, customerId, totalUsd, totalBs, exchangeRateBcv, exchangeRatePersonal } = req.body;

        let newSaleId: number | undefined;

        db.transaction((tx) => {
            const [newSale] = tx.insert(sales).values({
                customerId: customerId || null,
                totalUsd,
                totalBs,
                exchangeRateBcv,
                exchangeRatePersonal,
                status: 'COMPLETED',
                date: new Date()
            }).returning().all();

            if (!newSale) {
                throw new Error('Failed to create sale record.');
            }
            newSaleId = newSale.id;

            for (const item of items) {
                tx.insert(saleItems).values({
                    saleId: newSale.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    priceUsd: item.priceUsd,
                    priceBs: item.priceBs,
                    costUsd: item.costUsd
                }).run();

                tx.insert(inventoryMovements).values({
                    productId: item.productId,
                    type: 'OUT',
                    quantity: item.quantity,
                    reason: 'SALE',
                    transactionId: newSale.id,
                    date: new Date()
                }).run();

                const [currentProduct] = tx.select().from(products).where(eq(products.id, item.productId)).all();
                if (currentProduct) {
                    tx.update(products)
                        .set({ stock: currentProduct.stock - item.quantity, updatedAt: new Date() })
                        .where(eq(products.id, item.productId)).run();
                }
            }

            for (const payment of paymentList) {
                tx.insert(payments).values({
                    saleId: newSale.id,
                    amountUsd: payment.amountUsd,
                    amountBs: payment.amountBs,
                    method: payment.method,
                    reference: payment.reference,
                    date: new Date()
                }).run();
            }
        });

        if (!newSaleId) throw new Error('New Sale ID not captured');

        const [saleData] = db.select().from(sales).where(eq(sales.id, newSaleId)).all();
        const itemsData = db.select().from(saleItems).where(eq(saleItems.saleId, newSaleId)).all();
        const paymentsData = db.select().from(payments).where(eq(payments.saleId, newSaleId)).all();

        res.json({ 
            success: true, 
            message: 'Sale completed successfully',
            sale: {
                ...saleData,
                items: itemsData,
                payments: paymentsData
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process sale' });
    }
});

router.get('/', async (req, res) => {
    try {
        const allSales = db.select().from(sales).orderBy(desc(sales.date)).limit(100).all();
        res.json(allSales);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch sales history' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [saleData] = db.select().from(sales).where(eq(sales.id, id)).all();
        if (!saleData) {
            res.status(404).json({ error: 'Sale not found' });
            return;
        }

        const itemsData = db.select()
            .from(saleItems)
            .innerJoin(products, eq(saleItems.productId, products.id))
            .where(eq(saleItems.saleId, id))
            .all();

        const paymentsData = db.select().from(payments).where(eq(payments.saleId, id)).all();

        res.json({
            ...saleData,
            items: itemsData.map(row => ({
                ...row.sale_items,
                productName: row.products.name,
                productCode: row.products.code
            })),
            payments: paymentsData
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch sale details' });
    }
});

export default router;
