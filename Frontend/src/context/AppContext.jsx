import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { getBackendAdapter } from '../services/backend';

const AppContext = createContext(null);
const backend = getBackendAdapter();
const CURRENT_USER_STORAGE_KEY = 'inventory_current_user_id_v1';

const initialState = {
  currentUser: null,
  bootstrapRequired: false,
  users: [],
  warehouses: [],
  items: [],
  categories: [],
  stock: {},
  transactions: [],
  selectedWarehouseId: null,
};

function mergeState(base, patch) {
  return {
    ...base,
    ...patch,
  };
}

export function AppProvider({ children }) {
  const [state, setState] = useState(initialState);
  const [isInitializing, setIsInitializing] = useState(true);
  const [apiError, setApiError] = useState('');

  const initialize = useCallback(async () => {
    setIsInitializing(true);
    setApiError('');
    try {
      const data = await backend.loadInitialData();
      setState((prev) => {
        const persistedUserId =
          typeof window !== 'undefined'
            ? Number(window.localStorage.getItem(CURRENT_USER_STORAGE_KEY) || '')
            : NaN;

        const selectedWarehouseId =
          prev.selectedWarehouseId && data.warehouses.some((w) => w.id === prev.selectedWarehouseId)
            ? prev.selectedWarehouseId
            : data.warehouses[0]?.id || null;

        const currentUser = Number.isFinite(persistedUserId)
          ? data.users.find((user) => user.id === persistedUserId) || null
          : null;

        return {
          ...prev,
          ...data,
          currentUser,
          selectedWarehouseId,
        };
      });
    } catch (error) {
      setApiError(error?.message || 'Unable to load initial app data.');
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const persistCurrentUser = useCallback((user) => {
    if (typeof window === 'undefined') return;
    if (user?.id) {
      window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, String(user.id));
    } else {
      window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    }
  }, []);

  const runMutation = useCallback(async (task) => {
    setApiError('');
    const result = await task();
    if (!result?.ok) {
      setApiError(result?.error || 'Operation failed.');
      return { ok: false, error: result?.error || 'Operation failed.' };
    }

    if (result.data) {
      setState((prev) => mergeState(prev, result.data));
      if (Object.prototype.hasOwnProperty.call(result.data, 'currentUser')) {
        persistCurrentUser(result.data.currentUser);
      }
    }

    return { ok: true, data: result.data || {} };
  }, [persistCurrentUser]);

  const login = useCallback(async (username, pin) => {
    try {
      const user = await backend.login(state, { username, pin });
      if (!user) return false;
      setState((prev) => ({ ...prev, currentUser: user }));
      persistCurrentUser(user);
      setApiError('');
      return true;
    } catch (error) {
      setApiError(error?.message || 'Login failed.');
      return false;
    }
  }, [state, persistCurrentUser]);

  const createInitialManager = useCallback(async ({ displayName, username, pin }) => {
    const normalizedDisplayName = displayName?.trim();
    const normalizedUsername = username?.trim();
    const normalizedPin = String(pin ?? '').trim();

    if (!normalizedDisplayName) {
      return { ok: false, error: 'Display name is required.' };
    }
    if (!normalizedUsername) {
      return { ok: false, error: 'Username is required.' };
    }
    if (!/^\d{4}$/.test(normalizedPin)) {
      return { ok: false, error: 'PIN must be 4 digits.' };
    }

    return runMutation(() =>
      backend.createInitialManager(state, {
        displayName: normalizedDisplayName,
        username: normalizedUsername,
        pin: normalizedPin,
      })
    );
  }, [state, runMutation]);

  const logout = useCallback(() => {
    backend.logout?.();
    setState((prev) => ({ ...prev, currentUser: null, selectedWarehouseId: null }));
    persistCurrentUser(null);
  }, [persistCurrentUser]);

  const selectWarehouse = useCallback((id) => {
    setState((prev) => ({ ...prev, selectedWarehouseId: id }));
  }, []);

  const stockIn = useCallback((warehouseId, itemId, quantity, note) =>
    runMutation(() => backend.stockIn(state, { warehouseId, itemId, quantity, note })),
  [state, runMutation]);

  const stockOut = useCallback((warehouseId, itemId, quantity, note) =>
    runMutation(() => backend.stockOut(state, { warehouseId, itemId, quantity, note })),
  [state, runMutation]);

  const addItem = useCallback((item) =>
    runMutation(() => backend.addItem(state, item)),
  [state, runMutation]);

  const editItem = useCallback((item) =>
    runMutation(() => backend.editItem(state, item)),
  [state, runMutation]);

  const deleteItem = useCallback((id) =>
    runMutation(() => backend.deleteItem(state, { id })),
  [state, runMutation]);

  const addWarehouse = useCallback((warehouse) =>
    runMutation(() => backend.addWarehouse(state, warehouse)),
  [state, runMutation]);

  const editStock = useCallback((warehouseId, itemId, newQuantity, note) =>
    runMutation(() => backend.editStock(state, { warehouseId, itemId, newQuantity, note })),
  [state, runMutation]);

  const register = useCallback((userData) =>
    runMutation(() => backend.registerUser(state, userData)),
  [state, runMutation]);

  const resetPin = useCallback((username, pin) =>
    runMutation(() => backend.resetUserPin(state, { username, pin })),
  [state, runMutation]);

  const updateUser = useCallback((id, changes) =>
    runMutation(() => backend.updateUser(state, { id, ...changes })),
  [state, runMutation]);

  const exportData = useCallback((options = {}) =>
    backend.exportData(state, options),
  [state]);

  const importDataDryRun = useCallback((payload, options = {}) =>
    backend.importDataDryRun(state, payload, options),
  [state]);

  const importDataCommit = useCallback(async (payload, options = {}) => {
    const result = await backend.importDataCommit(state, payload, options);
    if (result?.ok) {
      await initialize();
    }
    return result;
  }, [state, initialize]);

  const getStockForWarehouse = useCallback((warehouseId) => {
    const wStock = state.stock[warehouseId] || {};
    return state.items
      .filter((item) => item.isActive)
      .map((item) => ({
        ...item,
        quantity: wStock[item.id] || 0,
      }));
  }, [state.stock, state.items]);

  const getTransactions = useCallback(({ warehouseId, itemId, limit } = {}) => {
    let txns = [...state.transactions];
    if (warehouseId) txns = txns.filter((t) => t.warehouseId === warehouseId);
    if (itemId) txns = txns.filter((t) => t.itemId === itemId);
    txns.sort((a, b) => b.createdAt - a.createdAt);
    if (limit) txns = txns.slice(0, limit);
    return txns;
  }, [state.transactions]);

  const value = useMemo(() => ({
    ...state,
    isInitializing,
    apiError,
    refreshInitialData: initialize,
    login,
    logout,
    createInitialManager,
    selectWarehouse,
    stockIn,
    stockOut,
    addItem,
    editItem,
    deleteItem,
    editStock,
    addWarehouse,
    register,
    resetPin,
    updateUser,
    exportData,
    importDataDryRun,
    importDataCommit,
    getStockForWarehouse,
    getTransactions,
  }), [
    state,
    isInitializing,
    apiError,
    initialize,
    login,
    logout,
    createInitialManager,
    selectWarehouse,
    stockIn,
    stockOut,
    addItem,
    editItem,
    deleteItem,
    editStock,
    addWarehouse,
    register,
    resetPin,
    updateUser,
    exportData,
    importDataDryRun,
    importDataCommit,
    getStockForWarehouse,
    getTransactions,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
