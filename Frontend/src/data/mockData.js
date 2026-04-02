// Mock data for the prototype — no backend needed

export const USERS = [
  { id: 1, username: 'jason', displayName: 'Jason', role: 'manager', pin: '1234' },
  { id: 2, username: 'maria', displayName: 'Maria', role: 'employee', pin: '0000' },
  { id: 3, username: 'kevin', displayName: 'Kevin', role: 'employee', pin: '1111' },
];

export const WAREHOUSES = [
  { id: 1, name: 'Main Warehouse', address: '123 Storage Ln',  isActive: true, lat: 40.7128, lng: -74.0060 },
  { id: 2, name: 'Downtown Shop',  address: '456 Main St',     isActive: true, lat: 40.7214, lng: -73.9980 },
  { id: 3, name: 'Eastside Shop',  address: '789 East Ave',    isActive: true, lat: 40.7180, lng: -73.9845 },
];

export const CATEGORIES = [
  'Green Tea',
  'Black Tea',
  'Herbal Tea',
  'Oolong Tea',
  'Accessories',
  'Packaging',
];

export const ITEMS = [
  { id: 1,  name: 'Jasmine Green Tea',        category: 'Green Tea',   unit: 'bags',  isActive: true, emoji: '🍵', color: '#86efac' },
  { id: 2,  name: 'Sencha Green Tea',          category: 'Green Tea',   unit: 'bags',  isActive: true, emoji: '🍃', color: '#86efac' },
  { id: 3,  name: 'Matcha Powder',             category: 'Green Tea',   unit: 'tins',  isActive: true, emoji: '🍵', color: '#4ade80' },
  { id: 4,  name: 'Dragon Well (Longjing)',    category: 'Green Tea',   unit: 'bags',  isActive: true, emoji: '🐉', color: '#86efac' },
  { id: 5,  name: 'Earl Grey',                 category: 'Black Tea',   unit: 'bags',  isActive: true, emoji: '☕', color: '#d4a574' },
  { id: 6,  name: 'English Breakfast',         category: 'Black Tea',   unit: 'bags',  isActive: true, emoji: '☕', color: '#c4956a' },
  { id: 7,  name: 'Darjeeling First Flush',    category: 'Black Tea',   unit: 'bags',  isActive: true, emoji: '🫖', color: '#d4a574' },
  { id: 8,  name: 'Chamomile Blend',           category: 'Herbal Tea',  unit: 'bags',  isActive: true, emoji: '🌼', color: '#fde68a' },
  { id: 9,  name: 'Peppermint Tea',            category: 'Herbal Tea',  unit: 'boxes', isActive: true, emoji: '🌿', color: '#a7f3d0' },
  { id: 10, name: 'Hibiscus Rose Tea',         category: 'Herbal Tea',  unit: 'bags',  isActive: true, emoji: '🌺', color: '#fda4af' },
  { id: 11, name: 'Tie Guan Yin Oolong',       category: 'Oolong Tea',  unit: 'bags',  isActive: true, emoji: '🍂', color: '#fdba74' },
  { id: 12, name: 'Da Hong Pao',               category: 'Oolong Tea',  unit: 'tins',  isActive: true, emoji: '🔥', color: '#fdba74' },
  { id: 13, name: 'Ceramic Teapot (Small)',     category: 'Accessories', unit: 'pcs',   isActive: true, emoji: '🫖', color: '#e5e7eb' },
  { id: 14, name: 'Glass Infuser Bottle',       category: 'Accessories', unit: 'pcs',   isActive: true, emoji: '🍶', color: '#bfdbfe' },
  { id: 15, name: 'Tea Tin (Empty, 100g)',      category: 'Packaging',   unit: 'pcs',   isActive: true, emoji: '📦', color: '#e5e7eb' },
  { id: 16, name: 'Gift Box — Sampler Set',     category: 'Packaging',   unit: 'pcs',   isActive: true, emoji: '🎁', color: '#fecaca' },
];

// Initial stock levels: { [warehouseId]: { [itemId]: quantity } }
export const INITIAL_STOCK = {
  1: { 1: 48, 2: 32, 3: 15, 4: 20, 5: 60, 6: 55, 7: 12, 8: 40, 9: 25, 10: 18, 11: 22, 12: 8, 13: 10, 14: 14, 15: 200, 16: 35 },
  2: { 1: 12, 2: 8,  3: 5,  4: 6,  5: 15, 6: 14, 7: 3,  8: 10, 9: 8,  10: 5,  11: 4,  12: 2,  13: 3,  14: 4,  15: 30,  16: 8 },
  3: { 1: 10, 2: 6,  3: 4,  4: 5,  5: 12, 6: 10, 7: 2,  8: 8,  9: 6,  10: 4,  11: 3,  12: 1,  13: 2,  14: 3,  15: 25,  16: 6 },
};

// Generate some realistic recent transactions
const now = Date.now();
const hour = 3600000;
const day = 86400000;

export const INITIAL_TRANSACTIONS = [
  { id: 1,  warehouseId: 1, itemId: 1,  userId: 2, type: 'out', quantity: 12, note: 'Taking to Downtown Shop',         createdAt: now - 2 * hour },
  { id: 2,  warehouseId: 1, itemId: 5,  userId: 2, type: 'out', quantity: 15, note: 'Taking to Downtown Shop',         createdAt: now - 2 * hour },
  { id: 3,  warehouseId: 1, itemId: 3,  userId: 3, type: 'in',  quantity: 20, note: 'Spring shipment from Uji',        createdAt: now - 5 * hour },
  { id: 4,  warehouseId: 2, itemId: 8,  userId: 2, type: 'out', quantity: 3,  note: 'Sold out, restocking shelf',      createdAt: now - 8 * hour },
  { id: 5,  warehouseId: 1, itemId: 15, userId: 1, type: 'in',  quantity: 100,note: 'Packaging order arrived',         createdAt: now - 1 * day },
  { id: 6,  warehouseId: 3, itemId: 6,  userId: 3, type: 'out', quantity: 5,  note: '',                                createdAt: now - 1.2 * day },
  { id: 7,  warehouseId: 1, itemId: 12, userId: 1, type: 'in',  quantity: 10, note: 'Premium oolong restock',           createdAt: now - 1.5 * day },
  { id: 8,  warehouseId: 1, itemId: 7,  userId: 3, type: 'out', quantity: 4,  note: 'Taking to Eastside Shop',         createdAt: now - 2 * day },
  { id: 9,  warehouseId: 2, itemId: 13, userId: 2, type: 'out', quantity: 1,  note: 'Display teapot broke',            createdAt: now - 2.5 * day },
  { id: 10, warehouseId: 1, itemId: 9,  userId: 1, type: 'in',  quantity: 30, note: 'Monthly herbal order',            createdAt: now - 3 * day },
  { id: 11, warehouseId: 2, itemId: 1,  userId: 2, type: 'out', quantity: 4,  note: 'Running low on shelf',            createdAt: now - 3.5 * day },
  { id: 12, warehouseId: 1, itemId: 10, userId: 3, type: 'in',  quantity: 15, note: 'New hibiscus blend arrived',       createdAt: now - 4 * day },
  { id: 13, warehouseId: 3, itemId: 5,  userId: 3, type: 'out', quantity: 6,  note: '',                                createdAt: now - 4.5 * day },
  { id: 14, warehouseId: 1, itemId: 16, userId: 1, type: 'in',  quantity: 20, note: 'Gift box restock for holidays',   createdAt: now - 5 * day },
  { id: 15, warehouseId: 2, itemId: 14, userId: 2, type: 'out', quantity: 2,  note: 'Customer purchase',               createdAt: now - 5.5 * day },
  { id: 16, warehouseId: 1, itemId: 2,  userId: 1, type: 'in',  quantity: 25, note: 'Sencha bulk order',               createdAt: now - 6 * day },
  { id: 17, warehouseId: 3, itemId: 11, userId: 3, type: 'out', quantity: 2,  note: 'Sample for tasting event',        createdAt: now - 6.5 * day },
  { id: 18, warehouseId: 1, itemId: 4,  userId: 2, type: 'in',   quantity: 12,  note: 'Dragon Well spring harvest',        createdAt: now - 7 * day },
  { id: 19, warehouseId: 1, itemId: 1,  userId: 1, type: 'edit', quantity: 50, previousQty: 48, note: 'Stock count correction',            createdAt: now - 3 * hour },
  { id: 20, warehouseId: 2, itemId: 5,  userId: 1, type: 'edit', quantity: 18, previousQty: 15, note: 'Physical count — found extra boxes', createdAt: now - 1 * day - 3 * hour },
  { id: 21, warehouseId: 3, itemId: 9,  userId: 3, type: 'edit', quantity: 4,  previousQty: 6,  note: 'Damaged stock removed from count',   createdAt: now - 2 * day - 1 * hour },
  { id: 22, warehouseId: 1, itemId: 16, userId: 1, type: 'edit', quantity: 28, previousQty: 35, note: 'Recount after gift box promo',       createdAt: now - 5 * day - 2 * hour },
];
