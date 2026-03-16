import { createContext, useContext, useReducer, useCallback } from 'react';
import {
  USERS,
  WAREHOUSES,
  ITEMS,
  CATEGORIES,
  INITIAL_STOCK,
  INITIAL_TRANSACTIONS,
} from '../data/mockData';

const AppContext = createContext(null);

const initialState = {
  // Auth
  currentUser: null,

  // Data
  users: USERS,
  warehouses: WAREHOUSES,
  items: ITEMS,
  categories: CATEGORIES,
  stock: INITIAL_STOCK,
  transactions: INITIAL_TRANSACTIONS,

  // UI state
  selectedWarehouseId: null,
};

function appReducer(state, action) {
  switch (action.type) {
    case 'LOGIN': {
      const user = state.users.find(
        (u) => u.username === action.payload.username && u.pin === action.payload.pin && u.isActive !== false
      );
      if (!user) return state;
      return { ...state, currentUser: user };
    }

    case 'LOGOUT':
      return { ...state, currentUser: null, selectedWarehouseId: null };

    case 'SELECT_WAREHOUSE':
      return { ...state, selectedWarehouseId: action.payload };

    case 'STOCK_IN': {
      const { warehouseId, itemId, quantity, note } = action.payload;
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

      return {
        ...state,
        stock: { ...state.stock, [warehouseId]: warehouseStock },
        transactions: [newTransaction, ...state.transactions],
      };
    }

    case 'STOCK_OUT': {
      const { warehouseId, itemId, quantity, note } = action.payload;
      const warehouseStock = { ...state.stock[warehouseId] };
      const currentQty = warehouseStock[itemId] || 0;
      if (quantity > currentQty) return state; // prevent negative
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

      return {
        ...state,
        stock: { ...state.stock, [warehouseId]: warehouseStock },
        transactions: [newTransaction, ...state.transactions],
      };
    }

    case 'ADD_ITEM': {
      const newItem = {
        id: Math.max(...state.items.map((i) => i.id)) + 1,
        ...action.payload,
        isActive: true,
      };
      return { ...state, items: [...state.items, newItem] };
    }

    case 'EDIT_ITEM': {
      const items = state.items.map((item) =>
        item.id === action.payload.id ? { ...item, ...action.payload } : item
      );
      return { ...state, items };
    }

    case 'ADD_WAREHOUSE': {
      const newWarehouse = {
        id: Math.max(...state.warehouses.map((w) => w.id)) + 1,
        ...action.payload,
        isActive: true,
      };
      // Initialize empty stock for the new warehouse
      const newStock = { ...state.stock, [newWarehouse.id]: {} };
      return { ...state, warehouses: [...state.warehouses, newWarehouse], stock: newStock };
    }

    case 'EDIT_STOCK': {
      const { warehouseId, itemId, newQuantity, note } = action.payload;
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
      return {
        ...state,
        stock: { ...state.stock, [warehouseId]: warehouseStock },
        transactions: [newTransaction, ...state.transactions],
      };
    }

    case 'REGISTER_USER': {
      const exists = state.users.find((u) => u.username === action.payload.username);
      if (exists) return state;
      const newUser = {
        id: Math.max(...state.users.map((u) => u.id)) + 1,
        ...action.payload,
      };
      return { ...state, users: [...state.users, newUser] };
    }

    case 'RESET_PIN': {
      const users = state.users.map((u) =>
        u.username === action.payload.username ? { ...u, pin: action.payload.pin } : u
      );
      return { ...state, users };
    }

    case 'UPDATE_USER': {
      const users = state.users.map((u) =>
        u.id === action.payload.id ? { ...u, ...action.payload } : u
      );
      // Keep currentUser in sync if the updated user is the logged-in user
      const currentUser =
        state.currentUser?.id === action.payload.id
          ? { ...state.currentUser, ...action.payload }
          : state.currentUser;
      return { ...state, users, currentUser };
    }

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const login = useCallback((username, pin) => {
    dispatch({ type: 'LOGIN', payload: { username, pin } });
    const user = state.users.find(
      (u) => u.username === username && u.pin === pin && u.isActive !== false
    );
    return !!user;
  }, [state.users]);

  const logout = useCallback(() => dispatch({ type: 'LOGOUT' }), []);

  const selectWarehouse = useCallback(
    (id) => dispatch({ type: 'SELECT_WAREHOUSE', payload: id }),
    []
  );

  const stockIn = useCallback(
    (warehouseId, itemId, quantity, note) =>
      dispatch({ type: 'STOCK_IN', payload: { warehouseId, itemId, quantity, note } }),
    []
  );

  const stockOut = useCallback(
    (warehouseId, itemId, quantity, note) =>
      dispatch({ type: 'STOCK_OUT', payload: { warehouseId, itemId, quantity, note } }),
    []
  );

  const addItem = useCallback(
    (item) => dispatch({ type: 'ADD_ITEM', payload: item }),
    []
  );

  const editItem = useCallback(
    (item) => dispatch({ type: 'EDIT_ITEM', payload: item }),
    []
  );

  const addWarehouse = useCallback(
    (warehouse) => dispatch({ type: 'ADD_WAREHOUSE', payload: warehouse }),
    []
  );

  const editStock = useCallback(
    (warehouseId, itemId, newQuantity, note) =>
      dispatch({ type: 'EDIT_STOCK', payload: { warehouseId, itemId, newQuantity, note } }),
    []
  );

  const register = useCallback((userData) => {
    dispatch({ type: 'REGISTER_USER', payload: userData });
  }, []);

  const resetPin = useCallback((username, pin) => {
    dispatch({ type: 'RESET_PIN', payload: { username, pin } });
  }, []);

  const updateUser = useCallback(
    (id, changes) => dispatch({ type: 'UPDATE_USER', payload: { id, ...changes } }),
    []
  );

  // Helper: get stock for current warehouse
  const getStockForWarehouse = useCallback(
    (warehouseId) => {
      const wStock = state.stock[warehouseId] || {};
      return state.items
        .filter((item) => item.isActive)
        .map((item) => ({
          ...item,
          quantity: wStock[item.id] || 0,
        }));
    },
    [state.stock, state.items]
  );

  // Helper: get transactions, optionally filtered
  const getTransactions = useCallback(
    ({ warehouseId, itemId, limit } = {}) => {
      let txns = [...state.transactions];
      if (warehouseId) txns = txns.filter((t) => t.warehouseId === warehouseId);
      if (itemId) txns = txns.filter((t) => t.itemId === itemId);
      txns.sort((a, b) => b.createdAt - a.createdAt);
      if (limit) txns = txns.slice(0, limit);
      return txns;
    },
    [state.transactions]
  );

  const value = {
    ...state,
    login,
    logout,
    selectWarehouse,
    stockIn,
    stockOut,
    addItem,
    editItem,
    editStock,
    addWarehouse,
    register,
    resetPin,
    updateUser,
    getStockForWarehouse,
    getTransactions,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
