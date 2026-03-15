import { Router } from 'express';
import { db } from '../db/index.js';
import { products, saleItems, productBarcodes, inventoryMovements } from '../db/schema.js';
import { eq, inArray } from 'drizzle-orm';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const allProducts = await db.select().from(products);
        res.json(allProducts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

router.post('/', async (req, res) => {
    try {
        const newProduct = req.body;
        const [inserted] = await db.insert(products).values({
            code: newProduct.code,
            name: newProduct.name,
            category: newProduct.category || null,
            costUsd: newProduct.costUsd,
            margin: newProduct.margin,
            stock: newProduct.stock || 0,
            isWeightable: newProduct.isWeightable || false,
            imageUrl: newProduct.imageUrl || null,
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();

        res.json(inserted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

router.post('/bulk', async (req, res) => {
    try {
        const productList = req.body;
        if (!Array.isArray(productList)) {
            res.status(400).json({ error: 'Expected an array of products' });
            return;
        }

        // Simplificado a ejecución directa dentro de transacción en backend v2 de TS
        const insertedProducts = db.transaction((tx) => {
            const results = [];
            for (const p of productList) {
                const [inserted] = tx.insert(products).values({
                    code: p.code,
                    name: p.name,
                    category: p.category || null,
                    costUsd: p.costUsd,
                    margin: p.margin ?? 0.30,
                    stock: p.stock || 0,
                    isWeightable: p.isWeightable || false,
                    imageUrl: p.imageUrl || null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }).returning().all();
                results.push(inserted);
            }
            return results;
        });

        res.json(insertedProducts);
    } catch (error) {
        console.error('Bulk import error:', error);
        res.status(500).json({ error: 'Failed to bulk import products' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { code, name, category, costUsd, margin, isWeightable, imageUrl } = req.body;
        const [updated] = await db.update(products).set({
            code, name, category, costUsd, margin, isWeightable, imageUrl, updatedAt: new Date()
        }).where(eq(products.id, id)).returning();
        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        db.transaction((tx) => {
            tx.delete(saleItems).where(eq(saleItems.productId, id)).run();
            tx.delete(productBarcodes).where(eq(productBarcodes.productId, id)).run();
            tx.delete(inventoryMovements).where(eq(inventoryMovements.productId, id)).run();
            tx.delete(products).where(eq(products.id, id)).run();
        });

        res.json({ success: true, message: 'Product deleted' });
    } catch (error: any) {
        console.error('Delete error:', error);
        res.status(500).json({ error: error.message || 'Failed to delete product' });
    }
});

router.post('/bulk-delete', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({ error: 'Expected a non-empty array of ids' });
            return;
        }

        db.transaction((tx) => {
            tx.delete(saleItems).where(inArray(saleItems.productId, ids)).run();
            tx.delete(productBarcodes).where(inArray(productBarcodes.productId, ids)).run();
            tx.delete(inventoryMovements).where(inArray(inventoryMovements.productId, ids)).run();
            tx.delete(products).where(inArray(products.id, ids)).run();
        });

        res.json({ success: true, message: `${ids.length} products deleted` });
    } catch (error: any) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ error: error.message || 'Failed to bulk delete products' });
    }
});

export default router;
