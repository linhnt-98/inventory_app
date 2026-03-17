import {
  USERS,
  WAREHOUSES,
  ITEMS,
  CATEGORIES,
  INITIAL_STOCK,
  INITIAL_TRANSACTIONS,
} from '../../data/mockData';
import { ok, fail } from './types';

const USERS_STORAGE_KEY = 'inventory_users_v1';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nextId(items) {
  return items.length ? Math.max(...items.map((item) => item.id)) + 1 : 1;
}

function hasManager(users) {
  return users.some((user) => user.role === 'manager');
}

function getDefaultUsers() {
  return USERS.filter((user) => user.role !== 'manager');
}

function getInitialUsers() {
  if (typeof window === 'undefined') return getDefaultUsers();

  try {
    const stored = window.localStorage.getItem(USERS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore parse/storage errors and fallback to seeded users
  }

  return getDefaultUsers();
}

export function createLocalBackend() {
  return {
    loadInitialData() {
      const users = clone(getInitialUsers());
      return {
        users,
        warehouses: clone(WAREHOUSES),
        items: clone(ITEMS),
        categories: clone(CATEGORIES),
        stock: clone(INITIAL_STOCK),
        transactions: clone(INITIAL_TRANSACTIONS),
        bootstrapRequired: !hasManager(users),
      };
    },

    persistUsers(users) {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    },

    login(state, { username, pin }) {
      return state.users.find(
        (user) => user.username === username && user.pin === pin && user.isActive !== false
      ) || null;
    },

    createInitialManager(state, payload) {
      if (!state.bootstrapRequired || hasManager(state.users)) {
        return fail('Setup has already been completed.');
      }

      const normalizedUsername = payload.username.toLowerCase();
      const usernameExists = state.users.some(
        (user) => user.username.toLowerCase() === normalizedUsername
      );
      if (usernameExists) {
        return fail('Username already exists.');
      }

      const newManager = {
        id: nextId(state.users),
        username: payload.username,
        displayName: payload.displayName,
        role: 'manager',
        pin: payload.pin,
      };

      return ok({
        users: [...state.users, newManager],
        currentUser: newManager,
        bootstrapRequired: false,
      });
    },

    registerUser(state, userData) {
      const exists = state.users.find((user) => user.username === userData.username);
      if (exists) return fail('Username already taken.');

      const newUser = {
        id: nextId(state.users),
        ...userData,
      };

      return ok({ users: [...state.users, newUser] });
    },

    resetUserPin(state, { username, pin }) {
      const users = state.users.map((user) =>
        user.username === username ? { ...user, pin } : user
      );
      return ok({ users });
    },

    updateUser(state, payload) {
      const users = state.users.map((user) =>
        user.id === payload.id ? { ...user, ...payload } : user
      );
      const currentUser =
        state.currentUser?.id === payload.id
          ? { ...state.currentUser, ...payload }
          : state.currentUser;
      return ok({ users, currentUser });
    },

    addItem(state, payload) {
      const newItem = {
        id: nextId(state.items),
        ...payload,
        isActive: true,
      };
      return ok({ items: [...state.items, newItem] });
    },

    editItem(state, payload) {
      const items = state.items.map((item) =>
        item.id === payload.id ? { ...item, ...payload } : item
      );
      return ok({ items });
    },

    addWarehouse(state, payload) {
      const newWarehouse = {
        id: nextId(state.warehouses),
        ...payload,
        isActive: true,
      };
      const stock = { ...state.stock, [newWarehouse.id]: {} };
      return ok({ warehouses: [...state.warehouses, newWarehouse], stock });
    },

    stockIn(state, payload) {
      if (!state.currentUser) return fail('You must be logged in.');

      const { warehouseId, itemId, quantity, note } = payload;
      const warehouseStock = { ...state.stock[warehouseId] };
      warehouseStock[itemId] = (warehouseStock[itemId] || 0) + quantity;

      const newTransaction = {
        id: state.transactions.length + 1,
        warehouseId,
        itemId,
        userId: state.currentUser.id,
        type: 'in',
        quantity,
        note: note || '',
        createdAt: Date.now(),
      };

      return ok({
        stock: { ...state.stock, [warehouseId]: warehouseStock },
        transactions: [newTransaction, ...state.transactions],
      });
    },

    stockOut(state, payload) {
      if (!state.currentUser) return fail('You must be logged in.');

      const { warehouseId, itemId, quantity, note } = payload;
      const warehouseStock = { ...state.stock[warehouseId] };
      const currentQty = warehouseStock[itemId] || 0;
      if (quantity > currentQty) return fail('Insufficient stock quantity.');

      warehouseStock[itemId] = currentQty - quantity;
      const newTransaction = {
        id: state.transactions.length + 1,
        warehouseId,
        itemId,
        userId: state.currentUser.id,
        type: 'out',
        quantity,
        note: note || '',
        createdAt: Date.now(),
      };

      return ok({
        stock: { ...state.stock, [warehouseId]: warehouseStock },
        transactions: [newTransaction, ...state.transactions],
      });
    },

    editStock(state, payload) {
      if (!state.currentUser) return fail('You must be logged in.');

      const { warehouseId, itemId, newQuantity, note } = payload;
      const warehouseStock = { ...state.stock[warehouseId] };
      const previousQty = warehouseStock[itemId] || 0;
      warehouseStock[itemId] = newQuantity;

      const newTransaction = {
        id: state.transactions.length + 1,
        warehouseId,
        itemId,
        userId: state.currentUser.id,
        type: 'edit',
        quantity: newQuantity,
        previousQty,
        note: note || '',
        createdAt: Date.now(),
      };

      return ok({
        stock: { ...state.stock, [warehouseId]: warehouseStock },
        transactions: [newTransaction, ...state.transactions],
      });
    },
  };
}
