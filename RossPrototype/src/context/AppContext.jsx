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
        (u) => u.username === action.payload.username && u.pin === action.payload.pin
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

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const login = useCallback((username, pin) => {
    dispatch({ type: 'LOGIN', payload: { username, pin } });
    const user = USERS.find((u) => u.username === username && u.pin === pin);
    return !!user;
  }, []);

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
    addWarehouse,
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
