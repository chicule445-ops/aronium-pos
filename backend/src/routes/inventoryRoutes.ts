import { Router } from 'express';
import { db } from '../db/index.js';
import { products, inventoryMovements } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

router.post('/adjust', async (req, res) => {
    try {
        const { productId, quantity, type, reason } = req.body;

        db.transaction((tx) => {
            tx.insert(inventoryMovements).values({
                productId,
                type,
                quantity,
                reason,
                date: new Date()
            }).run();

            const [currentProduct] = tx.select().from(products).where(eq(products.id, productId)).all();
            if (!currentProduct) throw new Error('Product not found');

            const adjustedStock = type === 'IN'
                ? currentProduct.stock + quantity
                : currentProduct.stock - quantity;

            tx.update(products).set({ stock: adjustedStock, updatedAt: new Date() }).where(eq(products.id, productId)).run();
        });

        res.json({ success: true, message: 'Stock adjusted ok' });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Failed to adjust stock' });
    }
});

export default router;
