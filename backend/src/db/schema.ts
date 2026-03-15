import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: real('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(), // Default/main barcode or internal code
  name: text('name').notNull(),
  category: text('category'),
  costUsd: real('cost_usd').notNull(),
  margin: real('margin').notNull(), // e.g., 0.30 for 30%
  stock: real('stock').notNull().default(0), // Real for weightable products
  isWeightable: integer('is_weightable', { mode: 'boolean' }).notNull().default(false),
  imageUrl: text('image_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const productBarcodes = sqliteTable('product_barcodes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => products.id),
  barcode: text('barcode').notNull().unique(),
});

export const inventoryMovements = sqliteTable('inventory_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => products.id),
  type: text('type', { enum: ['IN', 'OUT', 'ADJUST'] }).notNull(),
  quantity: real('quantity').notNull(),
  reason: text('reason').notNull(), // e.g., 'SALE', 'PURCHASE', 'MANUAL_ADJUST'
  transactionId: integer('transaction_id'), // links to sale or purchase if applicable
  date: integer('date', { mode: 'timestamp' }).notNull(),
});

export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  identityDocument: text('identity_document').notNull().unique(), // V-XXXX, J-XXXX
  name: text('name').notNull(),
  phone: text('phone'),
  address: text('address'),
});

export const sales = sqliteTable('sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customerId: integer('customer_id').references(() => customers.id),
  totalUsd: real('total_usd').notNull(),
  totalBs: real('total_bs').notNull(),
  exchangeRateBcv: real('exchange_rate_bcv').notNull(),
  exchangeRatePersonal: real('exchange_rate_personal').notNull(),
  status: text('status', { enum: ['COMPLETED', 'PENDING', 'CANCELLED'] }).notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
});

export const saleItems = sqliteTable('sale_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id').notNull().references(() => sales.id),
  productId: integer('product_id').notNull().references(() => products.id),
  quantity: real('quantity').notNull(),
  priceUsd: real('price_usd').notNull(),
  priceBs: real('price_bs').notNull(),
  costUsd: real('cost_usd').notNull(), // Locked at the moment of sale for profit calculation
});

export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id').references(() => sales.id),
  customerId: integer('customer_id').references(() => customers.id), // If it's a payment for CxC
  amountUsd: real('amount_usd'),
  amountBs: real('amount_bs'),
  method: text('method', { enum: ['CASH_USD', 'CASH_BS', 'DEBIT_BS', 'PAGO_MOVIL'] }).notNull(),
  reference: text('reference'), // For Pago Movil or Debit
  date: integer('date', { mode: 'timestamp' }).notNull(),
});
