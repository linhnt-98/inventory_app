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
const LOCAL_STATE_STORAGE_KEY = 'inventory_local_state_v1';
const LOCAL_SCHEMA_VERSION = '2026-04-local-v1';

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

function normalizeRole(role) {
  if (role === 'employee') return 'staff';
  if (role === 'manager') return 'manager';
  return role || 'staff';
}

function normalizeUsers(users) {
  return (users || []).map((user) => ({
    ...user,
    role: normalizeRole(user.role),
    isActive: user.isActive !== false,
  }));
}

function buildDefaultState() {
  const users = normalizeUsers(clone(getInitialUsers()));
  return {
    users,
    warehouses: clone(WAREHOUSES),
    items: clone(ITEMS),
    categories: clone(CATEGORIES),
    stock: clone(INITIAL_STOCK),
    transactions: clone(INITIAL_TRANSACTIONS),
    bootstrapRequired: !hasManager(users),
  };
}

function sanitizeStateShape(state) {
  const users = normalizeUsers(state?.users || []);
  return {
    users,
    warehouses: Array.isArray(state?.warehouses) ? state.warehouses : [],
    items: Array.isArray(state?.items) ? state.items : [],
    categories: Array.isArray(state?.categories) ? state.categories : [],
    stock: state?.stock && typeof state.stock === 'object' ? state.stock : {},
    transactions: Array.isArray(state?.transactions) ? state.transactions : [],
    bootstrapRequired: !hasManager(users),
  };
}

function mapLocalTypeToReason(type) {
  if (type === 'in') return 'stock_in';
  if (type === 'out') return 'stock_out';
  return 'adjustment';
}

function mapReasonToLocalType(reason) {
  if (reason === 'stock_in' || reason === 'transfer_in') return 'in';
  if (reason === 'stock_out' || reason === 'transfer_out') return 'out';
  return 'edit';
}

function inferDeltaFromTransaction(txn) {
  if (typeof txn.delta === 'number' && txn.delta !== 0) return txn.delta;
  const quantity = Number(txn.quantity || 0);
  if (txn.type === 'in') return quantity;
  if (txn.type === 'out') return -quantity;
  if (typeof txn.previousQty === 'number') return quantity - txn.previousQty;
  return 0;
}

export function createLocalBackend() {
  function loadStoredState() {
    if (typeof window === 'undefined') {
      return buildDefaultState();
    }

    try {
      const stored = window.localStorage.getItem(LOCAL_STATE_STORAGE_KEY);
      if (!stored) {
        const seeded = buildDefaultState();
        window.localStorage.setItem(LOCAL_STATE_STORAGE_KEY, JSON.stringify(seeded));
        window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(seeded.users));
        return seeded;
      }

      const parsed = JSON.parse(stored);
      const normalized = sanitizeStateShape(parsed);
      window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(normalized.users));
      return normalized;
    } catch {
      const fallback = buildDefaultState();
      window.localStorage.setItem(LOCAL_STATE_STORAGE_KEY, JSON.stringify(fallback));
      window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(fallback.users));
      return fallback;
    }
  }

  function persistState(nextState) {
    if (typeof window === 'undefined') return;
    const normalized = sanitizeStateShape(nextState);
    window.localStorage.setItem(LOCAL_STATE_STORAGE_KEY, JSON.stringify(normalized));
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(normalized.users));
  }

  function buildSnapshotFromState(state, options = {}) {
    const includeTransactions = options.includeTransactions ?? true;
    const includeUsers = options.includeUsers ?? true;
    const includeUserCredentials = options.includeUserCredentials ?? false;

    const categories = (state.categories || []).map((name) => ({
      name,
      is_active: true,
    }));

    const warehouseById = new Map((state.warehouses || []).map((w) => [w.id, w]));
    const itemById = new Map((state.items || []).map((i) => [i.id, i]));
    const userById = new Map((state.users || []).map((u) => [u.id, u]));
    const unitNames = Array.from(new Set((state.items || []).map((item) => item.unit || 'units'))).sort();

    const stockLevels = [];
    for (const [warehouseIdRaw, itemQuantities] of Object.entries(state.stock || {})) {
      const warehouseId = Number(warehouseIdRaw);
      const warehouse = warehouseById.get(warehouseId);
      if (!warehouse || !itemQuantities || typeof itemQuantities !== 'object') continue;

      for (const [itemIdRaw, quantityRaw] of Object.entries(itemQuantities)) {
        const itemId = Number(itemIdRaw);
        const item = itemById.get(itemId);
        if (!item) continue;

        const quantity = Number(quantityRaw || 0);
        stockLevels.push({
          warehouse_name: warehouse.name,
          item_sku: item.sku || null,
          item_name: item.name,
          quantity,
          last_updated_at: new Date().toISOString(),
        });
      }
    }

    const transactions = includeTransactions
      ? (state.transactions || []).map((txn) => {
          const item = itemById.get(txn.itemId);
          const warehouse = warehouseById.get(txn.warehouseId);
          const user = userById.get(txn.userId);
          const delta = inferDeltaFromTransaction(txn);
          return {
            warehouse_name: warehouse?.name || null,
            item_sku: item?.sku || null,
            item_name: item?.name || null,
            username: user?.username || null,
            delta,
            reason: mapLocalTypeToReason(txn.type),
            note: txn.note || '',
            created_at: new Date(txn.createdAt || Date.now()).toISOString(),
          };
        }).filter((txn) => txn.warehouse_name && txn.item_name && txn.username && txn.delta !== 0)
      : [];

    const users = includeUsers
      ? (state.users || []).map((user) => {
          const payload = {
            username: user.username,
            display_name: user.displayName,
            role: user.role === 'manager' ? 'manager' : 'employee',
            is_active: user.isActive !== false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          if (includeUserCredentials && user.pin) {
            payload.pin = user.pin;
          }

          return payload;
        })
      : [];

    return {
      meta: {
        export_version: '1.0',
        app_schema_version: LOCAL_SCHEMA_VERSION,
        exported_at: new Date().toISOString(),
        exported_by: {
          user_id: state.currentUser?.id || null,
          username: state.currentUser?.username || 'unknown',
          display_name: state.currentUser?.displayName || 'Unknown',
        },
        provider: 'local',
        options: {
          include_transactions: includeTransactions,
          include_users: includeUsers,
          include_user_credentials: includeUserCredentials,
        },
        entity_counts: {
          users: users.length,
          warehouses: (state.warehouses || []).length,
          categories: categories.length,
          units: unitNames.length,
          items: (state.items || []).length,
          stock_levels: stockLevels.length,
          stock_transactions: transactions.length,
        },
        checksum: null,
      },
      data: {
        users,
        warehouses: (state.warehouses || []).map((warehouse) => ({
          name: warehouse.name,
          address: warehouse.address || '',
          lat: warehouse.lat ?? null,
          lng: warehouse.lng ?? null,
          is_active: warehouse.isActive !== false,
        })),
        categories,
        units: unitNames.map((name) => ({ name, is_active: true })),
        items: (state.items || []).map((item) => ({
          name: item.name,
          description: item.description || null,
          sku: item.sku || null,
          category_name: item.category || null,
          unit_name: item.unit || 'units',
          attributes_json: item.attributes_json || null,
          is_active: item.isActive !== false,
        })),
        stock_levels: stockLevels,
        stock_transactions: transactions,
      },
    };
  }

  function runDryValidation(payload, mode, strict) {
    const errors = [];
    const warnings = [];

    if (!payload || typeof payload !== 'object') {
      errors.push({
        code: 'E_PAYLOAD_INVALID_JSON',
        message: 'Payload must be a JSON object',
        severity: 'error',
        entity: 'payload',
        field: null,
        key: null,
      });
    }

    const meta = payload?.meta;
    const data = payload?.data;

    if (!meta || typeof meta !== 'object') {
      errors.push({
        code: 'E_META_MISSING',
        message: 'Missing meta section',
        severity: 'error',
        entity: 'meta',
        field: null,
        key: null,
      });
    }

    if (!data || typeof data !== 'object') {
      errors.push({
        code: 'E_REQUIRED_SECTION_MISSING',
        message: 'Missing data section',
        severity: 'error',
        entity: 'data',
        field: null,
        key: null,
      });
    }

    const entities = ['users', 'warehouses', 'categories', 'units', 'items', 'stock_levels', 'stock_transactions'];
    const entityCounts = {};
    const createActions = {};
    const updateActions = {};
    const noopActions = {};

    for (const entity of entities) {
      const section = data?.[entity] ?? [];
      if (!Array.isArray(section)) {
        errors.push({
          code: 'E_FIELD_TYPE_INVALID',
          message: `${entity} must be an array`,
          severity: 'error',
          entity,
          field: entity,
          key: null,
        });
        entityCounts[entity] = 0;
        createActions[entity] = 0;
        updateActions[entity] = 0;
        noopActions[entity] = 0;
        continue;
      }

      entityCounts[entity] = section.length;
      createActions[entity] = section.length;
      updateActions[entity] = 0;
      noopActions[entity] = 0;
    }

    if (meta?.export_version && meta.export_version !== '1.0') {
      warnings.push({
        code: 'W_EXPORT_VERSION_UNVERIFIED',
        message: `Export version ${meta.export_version} is not verified by local importer`,
        severity: 'warning',
        entity: 'meta',
        field: 'export_version',
        key: null,
      });
    }

    return {
      ok: errors.length === 0,
      summary: {
        mode,
        strict,
        app_schema_version_detected: meta?.app_schema_version || null,
        entity_counts: entityCounts,
      },
      actions: {
        create: createActions,
        update: updateActions,
        noop: noopActions,
      },
      warnings,
      errors,
    };
  }

  function mergeImportIntoState(state, payload, options = {}) {
    const includeUsers = options.includeUsers ?? true;
    const includeTransactions = options.includeTransactions ?? true;
    const data = payload?.data || {};

    const users = normalizeUsers([...(state.users || [])]);
    const warehouses = [...(state.warehouses || [])];
    const items = [...(state.items || [])];
    const categoriesSet = new Set(state.categories || []);
    const stock = clone(state.stock || {});
    const transactions = [...(state.transactions || [])];

    const usersByUsername = new Map(users.map((user) => [String(user.username).toLowerCase(), user]));
    const warehousesByName = new Map(warehouses.map((warehouse) => [String(warehouse.name).toLowerCase(), warehouse]));
    const itemsBySku = new Map(items.filter((item) => item.sku).map((item) => [String(item.sku).toLowerCase(), item]));
    const itemsByName = new Map(items.map((item) => [String(item.name).toLowerCase(), item]));

    const nextUserId = () => nextId(users);
    const nextWarehouseId = () => nextId(warehouses);
    const nextItemId = () => nextId(items);
    const nextTransactionId = () => (transactions.length ? Math.max(...transactions.map((txn) => txn.id || 0)) + 1 : 1);

    if (includeUsers) {
      for (const payloadUser of data.users || []) {
        const username = String(payloadUser.username || '').trim();
        if (!username) continue;

        const key = username.toLowerCase();
        const existing = usersByUsername.get(key);
        const mappedRole = payloadUser.role === 'manager' ? 'manager' : 'staff';

        if (existing) {
          existing.displayName = payloadUser.display_name || existing.displayName;
          existing.role = mappedRole;
          existing.isActive = payloadUser.is_active !== false;
          if (payloadUser.pin) existing.pin = payloadUser.pin;
        } else {
          const newUser = {
            id: nextUserId(),
            username,
            displayName: payloadUser.display_name || username,
            role: mappedRole,
            pin: payloadUser.pin || '0000',
            isActive: payloadUser.is_active !== false,
          };
          users.push(newUser);
          usersByUsername.set(key, newUser);
        }
      }
    }

    for (const payloadWarehouse of data.warehouses || []) {
      const name = String(payloadWarehouse.name || '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const existing = warehousesByName.get(key);

      if (existing) {
        existing.address = payloadWarehouse.address || '';
        existing.lat = payloadWarehouse.lat ?? null;
        existing.lng = payloadWarehouse.lng ?? null;
        existing.isActive = payloadWarehouse.is_active !== false;
      } else {
        const newWarehouse = {
          id: nextWarehouseId(),
          name,
          address: payloadWarehouse.address || '',
          lat: payloadWarehouse.lat ?? null,
          lng: payloadWarehouse.lng ?? null,
          isActive: payloadWarehouse.is_active !== false,
        };
        warehouses.push(newWarehouse);
        warehousesByName.set(key, newWarehouse);
        stock[newWarehouse.id] = stock[newWarehouse.id] || {};
      }
    }

    for (const payloadCategory of data.categories || []) {
      const name = String(payloadCategory.name || '').trim();
      if (name) categoriesSet.add(name);
    }

    for (const payloadItem of data.items || []) {
      const itemName = String(payloadItem.name || '').trim();
      if (!itemName) continue;
      const itemSku = String(payloadItem.sku || '').trim() || null;

      if (payloadItem.category_name) categoriesSet.add(payloadItem.category_name);

      let existing = null;
      if (itemSku) existing = itemsBySku.get(itemSku.toLowerCase()) || null;
      if (!existing) existing = itemsByName.get(itemName.toLowerCase()) || null;

      if (existing) {
        existing.name = itemName;
        existing.sku = itemSku;
        existing.description = payloadItem.description || '';
        existing.category = payloadItem.category_name || existing.category || 'Uncategorized';
        existing.unit = payloadItem.unit_name || existing.unit || 'units';
        existing.attributes_json = payloadItem.attributes_json || null;
        existing.isActive = payloadItem.is_active !== false;
      } else {
        const newItem = {
          id: nextItemId(),
          name: itemName,
          sku: itemSku,
          description: payloadItem.description || '',
          category: payloadItem.category_name || 'Uncategorized',
          unit: payloadItem.unit_name || 'units',
          attributes_json: payloadItem.attributes_json || null,
          isActive: payloadItem.is_active !== false,
          emoji: '📦',
          color: '#e5e7eb',
        };
        items.push(newItem);
        itemsByName.set(newItem.name.toLowerCase(), newItem);
        if (newItem.sku) itemsBySku.set(newItem.sku.toLowerCase(), newItem);
      }
    }

    const latestWarehousesByName = new Map(warehouses.map((warehouse) => [warehouse.name.toLowerCase(), warehouse]));
    const latestItemsBySku = new Map(items.filter((item) => item.sku).map((item) => [item.sku.toLowerCase(), item]));
    const latestItemsByName = new Map(items.map((item) => [item.name.toLowerCase(), item]));
    const latestUsersByUsername = new Map(users.map((user) => [user.username.toLowerCase(), user]));

    for (const payloadLevel of data.stock_levels || []) {
      const warehouseName = String(payloadLevel.warehouse_name || '').trim().toLowerCase();
      const warehouse = latestWarehousesByName.get(warehouseName);
      if (!warehouse) continue;

      const skuKey = String(payloadLevel.item_sku || '').trim().toLowerCase();
      const itemNameKey = String(payloadLevel.item_name || '').trim().toLowerCase();
      const item = (skuKey && latestItemsBySku.get(skuKey)) || (itemNameKey && latestItemsByName.get(itemNameKey));
      if (!item) continue;

      const quantity = Number(payloadLevel.quantity || 0);
      if (Number.isNaN(quantity) || quantity < 0) continue;

      stock[warehouse.id] = stock[warehouse.id] || {};
      stock[warehouse.id][item.id] = quantity;
    }

    if (includeTransactions) {
      for (const payloadTxn of data.stock_transactions || []) {
        const warehouse = latestWarehousesByName.get(String(payloadTxn.warehouse_name || '').trim().toLowerCase());
        const user = latestUsersByUsername.get(String(payloadTxn.username || '').trim().toLowerCase());
        const skuKey = String(payloadTxn.item_sku || '').trim().toLowerCase();
        const itemNameKey = String(payloadTxn.item_name || '').trim().toLowerCase();
        const item = (skuKey && latestItemsBySku.get(skuKey)) || (itemNameKey && latestItemsByName.get(itemNameKey));
        const delta = Number(payloadTxn.delta || 0);

        if (!warehouse || !user || !item || !delta) continue;

        const createdAt = Date.parse(payloadTxn.created_at || '');
        transactions.push({
          id: nextTransactionId(),
          warehouseId: warehouse.id,
          itemId: item.id,
          userId: user.id,
          type: mapReasonToLocalType(payloadTxn.reason),
          delta,
          quantity: Math.abs(delta),
          note: payloadTxn.note || '',
          createdAt: Number.isNaN(createdAt) ? Date.now() : createdAt,
        });
      }
    }

    const categories = Array.from(categoriesSet).sort((a, b) => a.localeCompare(b));
    return sanitizeStateShape({
      ...state,
      users,
      warehouses,
      items,
      categories,
      stock,
      transactions,
      bootstrapRequired: !hasManager(users),
    });
  }

  return {
    loadInitialData() {
      return loadStoredState();
    },

    persistUsers(users) {
      const current = loadStoredState();
      persistState({
        ...current,
        users: normalizeUsers(users),
        bootstrapRequired: !hasManager(users),
      });
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

      const patch = {
        users: [...state.users, newManager],
        currentUser: newManager,
        bootstrapRequired: false,
      };

      persistState({ ...state, ...patch });
      return ok(patch);
    },

    registerUser(state, userData) {
      const exists = state.users.find((user) => user.username === userData.username);
      if (exists) return fail('Username already taken.');

      const newUser = {
        id: nextId(state.users),
        ...userData,
      };

      const patch = { users: [...state.users, newUser] };
      persistState({ ...state, ...patch });
      return ok(patch);
    },

    resetUserPin(state, { username, pin }) {
      const users = state.users.map((user) =>
        user.username === username ? { ...user, pin } : user
      );
      const patch = { users };
      persistState({ ...state, ...patch });
      return ok(patch);
    },

    updateUser(state, payload) {
      const users = state.users.map((user) =>
        user.id === payload.id ? { ...user, ...payload } : user
      );
      const currentUser =
        state.currentUser?.id === payload.id
          ? { ...state.currentUser, ...payload }
          : state.currentUser;
      const patch = { users, currentUser };
      persistState({ ...state, ...patch });
      return ok(patch);
    },

    addItem(state, payload) {
      const newItem = {
        id: nextId(state.items),
        ...payload,
        isActive: true,
      };

      const categories = state.categories.includes(payload.category)
        ? state.categories
        : [...state.categories, payload.category].sort((a, b) => a.localeCompare(b));

      const patch = { items: [...state.items, newItem], categories };
      persistState({ ...state, ...patch });
      return ok(patch);
    },

    editItem(state, payload) {
      const items = state.items.map((item) =>
        item.id === payload.id ? { ...item, ...payload } : item
      );
      const patch = { items };
      persistState({ ...state, ...patch });
      return ok(patch);
    },

    deleteItem(state, payload) {
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

      const patch = { items, stock };
      persistState({ ...state, ...patch });
      return ok(patch);
    },

    addWarehouse(state, payload) {
      const newWarehouse = {
        id: nextId(state.warehouses),
        ...payload,
        isActive: true,
      };
      const stock = { ...state.stock, [newWarehouse.id]: {} };
      const patch = { warehouses: [...state.warehouses, newWarehouse], stock };
      persistState({ ...state, ...patch });
      return ok(patch);
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

      const patch = {
        stock: { ...state.stock, [warehouseId]: warehouseStock },
        transactions: [newTransaction, ...state.transactions],
      };
      persistState({ ...state, ...patch });
      return ok(patch);
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

      const patch = {
        stock: { ...state.stock, [warehouseId]: warehouseStock },
        transactions: [newTransaction, ...state.transactions],
      };
      persistState({ ...state, ...patch });
      return ok(patch);
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

      const patch = {
        stock: { ...state.stock, [warehouseId]: warehouseStock },
        transactions: [newTransaction, ...state.transactions],
      };
      persistState({ ...state, ...patch });
      return ok(patch);
    },

    exportData(state, options = {}) {
      const snapshot = buildSnapshotFromState(state, options);
      return ok({ snapshot });
    },

    importDataDryRun(_state, payload, options = {}) {
      const mode = options.mode || 'merge';
      const strict = options.strict ?? true;
      const result = runDryValidation(payload, mode, strict);
      return ok(result);
    },

    importDataCommit(state, payload, options = {}) {
      const mode = options.mode || 'merge';
      const strict = options.strict ?? true;
      if (mode === 'replace') {
        return fail('Replace mode is not enabled yet in local backend.');
      }

      const validation = runDryValidation(payload, mode, strict);
      if (!validation.ok || (validation.errors || []).length > 0) {
        return fail('Import validation failed. Please run dry-run and fix errors first.');
      }

      const nextState = mergeImportIntoState(state, payload, options);
      persistState(nextState);
      return ok({
        import_id: `local_imp_${Date.now()}`,
        summary: {
          created: {},
          updated: {},
          skipped: {},
        },
        warnings: validation.warnings || [],
      });
    },
  };
}
