import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import { doc, getDoc, getFirestore, initializeFirestore, setDoc } from 'firebase/firestore';
import {
  USERS,
  WAREHOUSES,
  ITEMS,
  CATEGORIES,
  INITIAL_STOCK,
  INITIAL_TRANSACTIONS,
} from '../../data/mockData';
import { ok, fail } from './types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let firebaseClients = null;

const STATE_COLLECTION = 'app_state';
const STATE_DOC_ID = 'inventory';
const FIRESTORE_NETWORK_TIMEOUT_MS = 12000;

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
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_PROJECT_ID and related keys in your env files.');
  }
}

function withTimeout(promise, timeoutMs = FIRESTORE_NETWORK_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Firestore request timed out. If you use an ad blocker/privacy extension, allow firestore.googleapis.com and reload.'));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function toFriendlyFirebaseError(error) {
  const rawMessage = String(error?.message || '');
  const lowerMessage = rawMessage.toLowerCase();

  if (
    lowerMessage.includes('blocked_by_client')
    || lowerMessage.includes('firestore/listen/channel')
    || lowerMessage.includes('failed to fetch')
  ) {
    return new Error('Browser privacy/ad-block settings are blocking Firestore network requests. Allow firestore.googleapis.com (or test in Incognito without extensions) and refresh.');
  }

  if (error?.code === 'permission-denied') {
    return new Error('Firestore permission denied. Check your Firestore security rules for this project.');
  }

  if (error?.code === 'unavailable' || error?.code === 'deadline-exceeded') {
    return new Error('Firestore is temporarily unavailable or timing out. Check your network and try again.');
  }

  return error instanceof Error ? error : new Error('Unable to reach Firestore.');
}

function getFirebaseClients() {
  if (firebaseClients) {
    return firebaseClients;
  }

  ensureFirebaseConfig();

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  let db;
  try {
    db = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      useFetchStreams: false,
    });
  } catch {
    db = getFirestore(app);
  }

  firebaseClients = { app, db, analytics: null };

  if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
    isAnalyticsSupported()
      .then((supported) => {
        if (supported && firebaseClients) {
          firebaseClients.analytics = getAnalytics(app);
        }
      })
      .catch(() => {
        if (firebaseClients) {
          firebaseClients.analytics = null;
        }
      });
  }

  return firebaseClients;
}

function normalizeUsers(users) {
  return users.map((user) => ({
    ...user,
    role: normalizeRole(user.role),
    isActive: user.isActive ?? true,
  }));
}

function normalizeItemVisual(item) {
  const attributesJson = item?.attributes_json || item?.attributesJson || null;
  const visual = attributesJson?.visual || {};
  return {
    ...item,
    attributes_json: attributesJson,
    emoji: visual.value || item?.emoji || '📦',
    color: visual.bgColor || item?.color || '#e5e7eb',
  };
}

function buildItemAttributesFromPayload(payload = {}, existingItem = null) {
  const existingAttributes = existingItem?.attributes_json || existingItem?.attributesJson || null;
  const nextAttributes = { ...(existingAttributes || {}) };
  const currentVisual = nextAttributes.visual || {};

  nextAttributes.visual = {
    kind: 'emoji',
    value: payload.emoji || currentVisual.value || existingItem?.emoji || '📦',
    bgColor: payload.color || currentVisual.bgColor || existingItem?.color || '#e5e7eb',
  };

  return nextAttributes;
}

function normalizeStateShape(state) {
  return {
    users: normalizeUsers(state.users || []),
    warehouses: state.warehouses || [],
    items: (state.items || []).map(normalizeItemVisual),
    categories: state.categories || [],
    stock: state.stock || {},
    transactions: state.transactions || [],
    updatedAt: state.updatedAt || Date.now(),
  };
}

export function createFirebaseBackend() {
  const getStateRef = () => {
    const { db } = getFirebaseClients();
    return doc(db, STATE_COLLECTION, STATE_DOC_ID);
  };

  async function loadStoredState() {
    try {
      const stateRef = getStateRef();
      const snapshot = await withTimeout(getDoc(stateRef));
      if (!snapshot.exists()) {
        const seeded = buildDefaultState();
        await withTimeout(setDoc(stateRef, seeded));
        return seeded;
      }

      return normalizeStateShape(snapshot.data());
    } catch (error) {
      throw toFriendlyFirebaseError(error);
    }
  }

  async function saveStoredState(state) {
    try {
      const stateRef = getStateRef();
      const normalized = normalizeStateShape({
        ...state,
        updatedAt: Date.now(),
      });
      await withTimeout(setDoc(stateRef, normalized));
      return normalized;
    } catch (error) {
      throw toFriendlyFirebaseError(error);
    }
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
      const attributes_json = buildItemAttributesFromPayload(payload, null);
      const newItem = {
        id: nextId(state.items),
        ...payload,
        attributes_json,
        isActive: true,
        emoji: attributes_json.visual?.value || payload.emoji || '📦',
        color: attributes_json.visual?.bgColor || payload.color || '#e5e7eb',
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
      const existingItem = state.items.find((item) => item.id === payload.id);
      const attributes_json = buildItemAttributesFromPayload(payload, existingItem);
      const items = state.items.map((item) =>
        item.id === payload.id
          ? {
              ...item,
              ...payload,
              attributes_json,
              emoji: attributes_json.visual?.value || item.emoji || '📦',
              color: attributes_json.visual?.bgColor || item.color || '#e5e7eb',
            }
          : item
      );

      const nextState = {
        ...(await loadStoredState()),
        items,
      };

      await saveStoredState(nextState);
      return ok({ items });
    },

    async deleteItem(state, payload) {
      const hasTransactionHistory = state.transactions.some((txn) => txn.itemId === payload.id);
      if (hasTransactionHistory) {
        return fail('Item has transaction history and cannot be deleted. Deactivate it instead.');
      }

      const hasStockOnHand = Object.values(state.stock || {}).some((warehouseStock) => {
        const quantity = Number((warehouseStock || {})[payload.id] || 0);
        return quantity > 0;
      });
      if (hasStockOnHand) {
        return fail('Item has stock on hand and cannot be deleted.');
      }

      const items = state.items.filter((item) => item.id !== payload.id);
      const stock = Object.fromEntries(
        Object.entries(state.stock || {}).map(([warehouseId, warehouseStock]) => {
          const nextWarehouseStock = { ...(warehouseStock || {}) };
          delete nextWarehouseStock[payload.id];
          return [warehouseId, nextWarehouseStock];
        })
      );

      const nextState = {
        ...(await loadStoredState()),
        items,
        stock,
      };

      await saveStoredState(nextState);
      return ok({ items, stock });
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

    async exportData() {
      return fail('Data import/export is currently supported on FastAPI backend only.');
    },

    async importDataDryRun() {
      return fail('Data import/export is currently supported on FastAPI backend only.');
    },

    async importDataCommit() {
      return fail('Data import/export is currently supported on FastAPI backend only.');
    },

    logout() {},
  };
}
