import { Router } from 'express';
import { db } from '../db/index.js';
import { settings } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const allSettings = await db.select().from(settings);
        const configObj = allSettings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {} as Record<string, number>);
        res.json(configObj);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch config' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { key, value } = req.body;
        if (!key || value === undefined) {
            res.status(400).json({ error: 'Missing key or value' });
            return;
        }

        const existing = await db.select().from(settings).where(eq(settings.key, key));
        if (existing.length > 0) {
            await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key));
        } else {
            await db.insert(settings).values({ key, value, updatedAt: new Date() });
        }
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update config' });
    }
});

export default router;
