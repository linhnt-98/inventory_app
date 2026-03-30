import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../Firebase';
import {
  USERS,
  WAREHOUSES,
  ITEMS,
  CATEGORIES,
  INITIAL_STOCK,
  INITIAL_TRANSACTIONS,
} from '../../data/mockData';
import { ok, fail } from './types';

const STATE_COLLECTION = 'app_state';
const STATE_DOC_ID = 'inventory';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nextId(items) {
  return items.length ? Math.max(...items.map((item) => item.id)) + 1 : 1;
}

function normalizeRole(role) {
  if (!role) return 'staff';
  if (role === 'employee') return 'staff';
  return role;
}

function hasManager(users) {
  return users.some((user) => normalizeRole(user.role) === 'manager');
}

function getDefaultUsers() {
  return USERS
    .filter((user) => normalizeRole(user.role) !== 'manager')
    .map((user) => ({
      ...user,
      role: normalizeRole(user.role),
      isActive: user.isActive ?? true,
    }));
}

function buildDefaultState() {
  return {
    users: clone(getDefaultUsers()),
    warehouses: clone(WAREHOUSES),
    items: clone(ITEMS),
    categories: clone(CATEGORIES),
    stock: clone(INITIAL_STOCK),
    transactions: clone(INITIAL_TRANSACTIONS),
    updatedAt: Date.now(),
  };
}

function ensureFirebaseConfig() {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_PROJECT_ID and related keys in .env.local.');
  }
}

function normalizeUsers(users) {
  return users.map((user) => ({
    ...user,
    role: normalizeRole(user.role),
    isActive: user.isActive ?? true,
  }));
}

function normalizeStateShape(state) {
  return {
    users: normalizeUsers(state.users || []),
    warehouses: state.warehouses || [],
    items: state.items || [],
    categories: state.categories || [],
    stock: state.stock || {},
    transactions: state.transactions || [],
    updatedAt: state.updatedAt || Date.now(),
  };
}

export function createFirebaseBackend() {
  const stateRef = doc(db, STATE_COLLECTION, STATE_DOC_ID);

  async function loadStoredState() {
    ensureFirebaseConfig();

    const snapshot = await getDoc(stateRef);
    if (!snapshot.exists()) {
      const seeded = buildDefaultState();
      await setDoc(stateRef, seeded);
      return seeded;
    }

    return normalizeStateShape(snapshot.data());
  }

  async function saveStoredState(state) {
    const normalized = normalizeStateShape({
      ...state,
      updatedAt: Date.now(),
    });
    await setDoc(stateRef, normalized);
    return normalized;
  }

  return {
    async loadInitialData() {
      const state = await loadStoredState();
      return {
        users: clone(state.users),
        warehouses: clone(state.warehouses),
        items: clone(state.items),
        categories: clone(state.categories),
        stock: clone(state.stock),
        transactions: clone(state.transactions),
        bootstrapRequired: !hasManager(state.users),
      };
    },

    async persistUsers(users) {
      const state = await loadStoredState();
      await saveStoredState({
        ...state,
        users: normalizeUsers(clone(users)),
      });
    },

    async login(state, { username, pin }) {
      return state.users.find(
        (user) => user.username === username && user.pin === pin && user.isActive !== false
      ) || null;
    },

    async createInitialManager(state, payload) {
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
        isActive: true,
      };

      const nextUsers = [...state.users, newManager];

      await this.persistUsers(nextUsers);

      return ok({
        users: nextUsers,
        currentUser: newManager,
        bootstrapRequired: false,
      });
    },

    async registerUser(state, userData) {
      const exists = state.users.find((user) => user.username === userData.username);
      if (exists) return fail('Username already taken.');

      const newUser = {
        id: nextId(state.users),
        ...userData,
        role: normalizeRole(userData.role),
        isActive: true,
      };

      const users = [...state.users, newUser];
      await this.persistUsers(users);
      return ok({ users });
    },

    async resetUserPin(state, { username, pin }) {
      const users = state.users.map((user) =>
        user.username === username ? { ...user, pin } : user
      );

      await this.persistUsers(users);
      return ok({ users });
    },

    async updateUser(state, payload) {
      const users = state.users.map((user) => {
        if (user.id !== payload.id) return user;
        const nextRole = payload.role !== undefined ? normalizeRole(payload.role) : user.role;
        return { ...user, ...payload, role: nextRole };
      });

      await this.persistUsers(users);

      const currentUser =
        state.currentUser?.id === payload.id
          ? { ...state.currentUser, ...payload, role: normalizeRole(payload.role ?? state.currentUser.role) }
          : state.currentUser;

      return ok({ users, currentUser });
    },

    async addItem(state, payload) {
      const newItem = {
        id: nextId(state.items),
        ...payload,
        isActive: true,
        emoji: payload.emoji || '📦',
        color: payload.color || '#e5e7eb',
      };

      const categories = state.categories.includes(payload.category)
        ? state.categories
        : [...state.categories, payload.category].sort((a, b) => a.localeCompare(b));

      const nextState = {
        ...(await loadStoredState()),
        items: [...state.items, newItem],
        categories,
      };

      await saveStoredState(nextState);
      return ok({ items: nextState.items, categories: nextState.categories });
    },

    async editItem(state, payload) {
      const items = state.items.map((item) =>
        item.id === payload.id ? { ...item, ...payload } : item
      );

      const nextState = {
        ...(await loadStoredState()),
        items,
      };

      await saveStoredState(nextState);
      return ok({ items });
    },

    async addWarehouse(state, payload) {
      const newWarehouse = {
        id: nextId(state.warehouses),
        ...payload,
        isActive: true,
      };

      const stock = { ...state.stock, [newWarehouse.id]: {} };

      const nextState = {
        ...(await loadStoredState()),
        warehouses: [...state.warehouses, newWarehouse],
        stock,
      };

      await saveStoredState(nextState);
      return ok({ warehouses: nextState.warehouses, stock });
    },

    async stockIn(state, payload) {
      if (!state.currentUser) return fail('You must be logged in.');

      const { warehouseId, itemId, quantity, note } = payload;
      const warehouseStock = { ...(state.stock[warehouseId] || {}) };
      warehouseStock[itemId] = (warehouseStock[itemId] || 0) + quantity;

      const newTransaction = {
        id: state.transactions.length ? Math.max(...state.transactions.map((txn) => txn.id)) + 1 : 1,
        warehouseId,
        itemId,
        userId: state.currentUser.id,
        type: 'in',
        quantity,
        note: note || '',
        createdAt: Date.now(),
      };

      const stock = { ...state.stock, [warehouseId]: warehouseStock };
      const transactions = [newTransaction, ...state.transactions];

      const nextState = {
        ...(await loadStoredState()),
        stock,
        transactions,
      };

      await saveStoredState(nextState);
      return ok({ stock, transactions });
    },

    async stockOut(state, payload) {
      if (!state.currentUser) return fail('You must be logged in.');

      const { warehouseId, itemId, quantity, note } = payload;
      const warehouseStock = { ...(state.stock[warehouseId] || {}) };
      const currentQty = warehouseStock[itemId] || 0;
      if (quantity > currentQty) return fail('Insufficient stock quantity.');

      warehouseStock[itemId] = currentQty - quantity;

      const newTransaction = {
        id: state.transactions.length ? Math.max(...state.transactions.map((txn) => txn.id)) + 1 : 1,
        warehouseId,
        itemId,
        userId: state.currentUser.id,
        type: 'out',
        quantity,
        note: note || '',
        createdAt: Date.now(),
      };

      const stock = { ...state.stock, [warehouseId]: warehouseStock };
      const transactions = [newTransaction, ...state.transactions];

      const nextState = {
        ...(await loadStoredState()),
        stock,
        transactions,
      };

      await saveStoredState(nextState);
      return ok({ stock, transactions });
    },

    async editStock(state, payload) {
      if (!state.currentUser) return fail('You must be logged in.');

      const { warehouseId, itemId, newQuantity, note } = payload;
      const warehouseStock = { ...(state.stock[warehouseId] || {}) };
      const previousQty = warehouseStock[itemId] || 0;
      warehouseStock[itemId] = newQuantity;

      const newTransaction = {
        id: state.transactions.length ? Math.max(...state.transactions.map((txn) => txn.id)) + 1 : 1,
        warehouseId,
        itemId,
        userId: state.currentUser.id,
        type: 'edit',
        quantity: newQuantity,
        previousQty,
        delta: newQuantity - previousQty,
        note: note || '',
        createdAt: Date.now(),
      };

      const stock = { ...state.stock, [warehouseId]: warehouseStock };
      const transactions = [newTransaction, ...state.transactions];

      const nextState = {
        ...(await loadStoredState()),
        stock,
        transactions,
      };

      await saveStoredState(nextState);
      return ok({ stock, transactions });
    },

    logout() {},
  };
}
