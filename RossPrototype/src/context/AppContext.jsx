import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { getBackendAdapter } from '../services/backend';

const AppContext = createContext(null);

const backend = getBackendAdapter();
const initialBackendState = backend.loadInitialData();

const initialState = {
  // Auth
  currentUser: null,
  bootstrapRequired: initialBackendState.bootstrapRequired,

  // Data
  users: initialBackendState.users,
  warehouses: initialBackendState.warehouses,
  items: initialBackendState.items,
  categories: initialBackendState.categories,
  stock: initialBackendState.stock,
  transactions: initialBackendState.transactions,

  // UI state
  selectedWarehouseId: null,
};

function appReducer(state, action) {
  switch (action.type) {
    case 'LOGIN': {
      const user = backend.login(state, action.payload);
      if (!user) return state;
      return { ...state, currentUser: user };
    }

    case 'CREATE_INITIAL_MANAGER': {
      const result = backend.createInitialManager(state, action.payload);
      if (!result.ok) return state;
      return { ...state, ...result.data };
    }

    case 'LOGOUT':
      return { ...state, currentUser: null, selectedWarehouseId: null };

    case 'SELECT_WAREHOUSE':
      return { ...state, selectedWarehouseId: action.payload };

    case 'STOCK_IN': {
      const result = backend.stockIn(state, action.payload);
      if (!result.ok) return state;
      return { ...state, ...result.data };
    }

    case 'STOCK_OUT': {
      const result = backend.stockOut(state, action.payload);
      if (!result.ok) return state;
      return { ...state, ...result.data };
    }

    case 'ADD_ITEM': {
      const result = backend.addItem(state, action.payload);
      if (!result.ok) return state;
      return { ...state, ...result.data };
    }

    case 'EDIT_ITEM': {
      const result = backend.editItem(state, action.payload);
      if (!result.ok) return state;
      return { ...state, ...result.data };
    }

    case 'ADD_WAREHOUSE': {
      const result = backend.addWarehouse(state, action.payload);
      if (!result.ok) return state;
      return { ...state, ...result.data };
    }

    case 'EDIT_STOCK': {
      const result = backend.editStock(state, action.payload);
      if (!result.ok) return state;
      return { ...state, ...result.data };
    }

    case 'REGISTER_USER': {
      const result = backend.registerUser(state, action.payload);
      if (!result.ok) return state;
      return { ...state, ...result.data };
    }

    case 'RESET_PIN': {
      const result = backend.resetUserPin(state, action.payload);
      if (!result.ok) return state;
      return { ...state, ...result.data };
    }

    case 'UPDATE_USER': {
      const result = backend.updateUser(state, action.payload);
      if (!result.ok) return state;
      return { ...state, ...result.data };
    }

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    backend.persistUsers?.(state.users);
  }, [state.users]);

  const login = useCallback((username, pin) => {
    const user = state.users.find(
      (u) => u.username === username && u.pin === pin && u.isActive !== false
    );
    if (!user) return false;
    dispatch({ type: 'LOGIN', payload: { username, pin } });
    return !!user;
  }, [state.users]);

  const createInitialManager = useCallback(({ displayName, username, pin }) => {
    const normalizedDisplayName = displayName?.trim();
    const normalizedUsername = username?.trim();
    const normalizedPin = String(pin ?? '').trim();

    if (!state.bootstrapRequired) {
      return { ok: false, error: 'Setup has already been completed.' };
    }
    if (!normalizedDisplayName) {
      return { ok: false, error: 'Display name is required.' };
    }
    if (!normalizedUsername) {
      return { ok: false, error: 'Username is required.' };
    }
    if (!/^\d{4}$/.test(normalizedPin)) {
      return { ok: false, error: 'PIN must be 4 digits.' };
    }

    const usernameExists = state.users.some(
      (user) => user.username.toLowerCase() === normalizedUsername.toLowerCase()
    );
    if (usernameExists) {
      return { ok: false, error: 'Username already exists.' };
    }

    dispatch({
      type: 'CREATE_INITIAL_MANAGER',
      payload: {
        displayName: normalizedDisplayName,
        username: normalizedUsername,
        pin: normalizedPin,
      },
    });

    return { ok: true };
  }, [state.bootstrapRequired, state.users]);

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
    createInitialManager,
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
