import { pgTable, text, integer, doublePrecision, timestamp, boolean, serial, pgEnum } from 'drizzle-orm/pg-core';

export const movementTypeEnum = pgEnum('movement_type', ['IN', 'OUT', 'ADJUST']);
export const saleStatusEnum = pgEnum('sale_status', ['COMPLETED', 'PENDING', 'CANCELLED']);
export const paymentMethodEnum = pgEnum('payment_method', ['CASH_USD', 'CASH_BS', 'DEBIT_BS', 'PAGO_MOVIL']);

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: doublePrecision('value').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  category: text('category'),
  costUsd: doublePrecision('cost_usd').notNull(),
  margin: doublePrecision('margin').notNull(),
  stock: doublePrecision('stock').notNull().default(0),
  isWeightable: boolean('is_weightable').notNull().default(false),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const productBarcodes = pgTable('product_barcodes', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  barcode: text('barcode').notNull().unique(),
});

export const inventoryMovements = pgTable('inventory_movements', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  type: text('type').notNull(), // Using text to match sqlite logic for now, or use enum
  quantity: doublePrecision('quantity').notNull(),
  reason: text('reason').notNull(),
  transactionId: integer('transaction_id'),
  date: timestamp('date').notNull(),
});

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  identityDocument: text('identity_document').notNull().unique(),
  name: text('name').notNull(),
  phone: text('phone'),
  address: text('address'),
});

export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').references(() => customers.id),
  totalUsd: doublePrecision('total_usd').notNull(),
  totalBs: doublePrecision('total_bs').notNull(),
  exchangeRateBcv: doublePrecision('exchange_rate_bcv').notNull(),
  exchangeRatePersonal: doublePrecision('exchange_rate_personal').notNull(),
  status: text('status').notNull(),
  date: timestamp('date').notNull(),
});

export const saleItems = pgTable('sale_items', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id').notNull().references(() => sales.id),
  productId: integer('product_id').notNull().references(() => products.id),
  quantity: doublePrecision('quantity').notNull(),
  priceUsd: doublePrecision('price_usd').notNull(),
  priceBs: doublePrecision('price_bs').notNull(),
  costUsd: doublePrecision('cost_usd').notNull(),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id').references(() => sales.id),
  customerId: integer('customer_id').references(() => customers.id),
  amountUsd: doublePrecision('amount_usd'),
  amountBs: doublePrecision('amount_bs'),
  method: text('method').notNull(),
  reference: text('reference'),
  date: timestamp('date').notNull(),
});
