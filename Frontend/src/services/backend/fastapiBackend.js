const TOKEN_STORAGE_KEY = 'inventory_auth_token_v1';

function toErrorMessage(error, fallback = 'Request failed') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  return error.message || fallback;
}

function normalizeRole(role) {
  if (role === 'employee') return 'staff';
  return role || 'staff';
}

function mapUser(apiUser) {
  return {
    id: apiUser.id,
    username: apiUser.username,
    displayName: apiUser.display_name,
    role: normalizeRole(apiUser.role),
    isActive: apiUser.is_active,
  };
}

function extractVisualFromAttributes(attributesJson) {
  const visual = attributesJson?.visual || {};
  return {
    emoji: visual.value || '📦',
    color: visual.bgColor || '#e5e7eb',
  };
}

function buildVisualAttributes(payload = {}, existingAttributes = null) {
  const nextAttributes = { ...(existingAttributes || {}) };
  const currentVisual = nextAttributes.visual || {};

  const nextEmoji = payload.emoji || currentVisual.value || '📦';
  const nextColor = payload.color || currentVisual.bgColor || '#e5e7eb';

  nextAttributes.visual = {
    kind: 'emoji',
    value: nextEmoji,
    bgColor: nextColor,
  };

  return nextAttributes;
}

function mapItem(apiItem, categoriesById, unitsById) {
  const visual = extractVisualFromAttributes(apiItem.attributes_json);
  return {
    id: apiItem.id,
    name: apiItem.name,
    category: categoriesById.get(apiItem.category_id) || 'Uncategorized',
    unit: unitsById.get(apiItem.unit_id) || 'units',
    isActive: apiItem.is_active,
    emoji: visual.emoji,
    color: visual.color,
    attributesJson: apiItem.attributes_json || null,
  };
}

function mapTransactions(apiTransactions) {
  return apiTransactions.map((tx) => {
    const reason = tx.reason;
    let type = 'edit';
    if (reason === 'stock_in' || reason === 'transfer_in') type = 'in';
    if (reason === 'stock_out' || reason === 'transfer_out') type = 'out';

    return {
      id: tx.id,
      warehouseId: tx.warehouse_id,
      itemId: tx.item_id,
      userId: tx.user_id,
      type,
      delta: tx.delta,
      quantity: Math.abs(tx.delta),
      note: tx.note || '',
      createdAt: new Date(tx.created_at).getTime(),
    };
  });
}

function buildStockShape(levels) {
  const stock = {};
  for (const level of levels) {
    if (!stock[level.warehouse_id]) stock[level.warehouse_id] = {};
    stock[level.warehouse_id][level.item_id] = level.quantity;
  }
  return stock;
}

async function parseJsonResponse(response) {
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = body?.detail || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return body;
}

export function createFastApiBackend() {
  const baseUrl = (import.meta.env.VITE_FASTAPI_BASE_URL || 'http://127.0.0.1:8001').replace(/\/$/, '');

  let accessToken =
    typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_STORAGE_KEY) : null;

  function setToken(token) {
    accessToken = token || null;
    if (typeof window === 'undefined') return;
    if (accessToken) window.localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  async function apiRequest(path, { method = 'GET', body, auth = false } = {}) {
    const headers = {
      Accept: 'application/json',
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (auth) {
      if (!accessToken) throw new Error('You must be logged in.');
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    return parseJsonResponse(response);
  }

  async function ensureLookupId(kind, name) {
    const listPath = kind === 'category' ? '/api/v1/lookups/categories' : '/api/v1/lookups/units';
    const createPath = listPath;

    const existing = await apiRequest(listPath);
    const match = existing.find((item) => item.name.toLowerCase() === name.toLowerCase());
    if (match) return match.id;

    const created = await apiRequest(createPath, {
      method: 'POST',
      auth: true,
      body: { name },
    });
    return created.id;
  }

  async function loadInitialData() {
    const data = await apiRequest('/api/v1/bootstrap/initial-data');

    const categoriesById = new Map(data.categories.map((cat) => [cat.id, cat.name]));
    const unitsById = new Map(data.units.map((unit) => [unit.id, unit.name]));

    return {
      users: data.users.map(mapUser),
      warehouses: data.warehouses.map((w) => ({
        id: w.id,
        name: w.name,
        address: w.address || '',
        lat: w.lat,
        lng: w.lng,
        isActive: w.is_active,
      })),
      items: data.items.map((item) => mapItem(item, categoriesById, unitsById)),
      categories: data.categories.map((cat) => cat.name),
      stock: buildStockShape(data.stock_levels),
      transactions: mapTransactions(data.transactions),
      bootstrapRequired: data.bootstrap_required,
      hasSession: Boolean(accessToken),
    };
  }

  async function login(_state, { username, pin }) {
    const result = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      body: { username, pin },
    });

    setToken(result.access_token);
    return mapUser(result.user);
  }

  async function createInitialManager(_state, payload) {
    try {
      const user = await apiRequest('/api/v1/bootstrap/manager', {
        method: 'POST',
        body: {
          username: payload.username,
          display_name: payload.displayName,
          pin: payload.pin,
        },
      });

      const session = await apiRequest('/api/v1/auth/login', {
        method: 'POST',
        body: { username: payload.username, pin: payload.pin },
      });
      setToken(session.access_token);

      const initial = await loadInitialData();
      return {
        ok: true,
        data: {
          ...initial,
          currentUser: mapUser(user),
          bootstrapRequired: false,
        },
      };
    } catch (error) {
      return { ok: false, error: toErrorMessage(error, 'Unable to create manager account.') };
    }
  }

  async function registerUser(state, userData) {
    try {
      const created = await apiRequest('/api/v1/users', {
        method: 'POST',
        auth: true,
        body: {
          username: userData.username,
          display_name: userData.displayName,
          role: userData.role === 'manager' ? 'manager' : 'employee',
          pin: userData.pin,
        },
      });
      return { ok: true, data: { users: [...state.users, mapUser(created)] } };
    } catch (error) {
      return { ok: false, error: toErrorMessage(error, 'Unable to create user.') };
    }
  }

  async function resetUserPin(state, payload) {
    try {
      const target = state.users.find((u) => u.username === payload.username);
      if (!target) return { ok: false, error: 'User not found.' };

      const updated = await apiRequest(`/api/v1/users/${target.id}/reset-pin`, {
        method: 'POST',
        auth: true,
        body: { pin: payload.pin },
      });

      const users = state.users.map((user) => (user.id === updated.id ? mapUser(updated) : user));
      return { ok: true, data: { users } };
    } catch (error) {
      return { ok: false, error: toErrorMessage(error, 'Unable to reset PIN.') };
    }
  }

  async function updateUser(state, payload) {
    try {
      const apiPayload = {};
      if (payload.displayName !== undefined) apiPayload.display_name = payload.displayName;
      if (payload.role !== undefined) {
        apiPayload.role = payload.role === 'manager' ? 'manager' : 'employee';
      }
      if (payload.isActive !== undefined) apiPayload.is_active = payload.isActive;

      const updated = await apiRequest(`/api/v1/users/${payload.id}`, {
        method: 'PATCH',
        auth: true,
        body: apiPayload,
      });

      const normalized = mapUser(updated);
      const users = state.users.map((user) => (user.id === payload.id ? normalized : user));
      const currentUser = state.currentUser?.id === payload.id ? normalized : state.currentUser;
      return { ok: true, data: { users, currentUser } };
    } catch (error) {
      return { ok: false, error: toErrorMessage(error, 'Unable to update user.') };
    }
  }

  async function addItem(state, payload) {
    try {
      const categoryName = payload.category || 'Uncategorized';
      const unitName = payload.unit || 'units';
      const categoryId = await ensureLookupId('category', categoryName);
      const unitId = await ensureLookupId('unit', unitName);

      const created = await apiRequest('/api/v1/items', {
        method: 'POST',
        auth: true,
        body: {
          name: payload.name,
          category_id: categoryId,
          unit_id: unitId,
          description: payload.description || '',
          attributes_json: buildVisualAttributes(payload),
        },
      });

      const visual = extractVisualFromAttributes(created.attributes_json || buildVisualAttributes(payload));

      const item = {
        id: created.id,
        name: created.name,
        category: categoryName,
        unit: unitName,
        isActive: created.is_active,
        emoji: visual.emoji,
        color: visual.color,
        attributesJson: created.attributes_json || buildVisualAttributes(payload),
      };

      const categories = state.categories.includes(categoryName)
        ? state.categories
        : [...state.categories, categoryName].sort((a, b) => a.localeCompare(b));

      return {
        ok: true,
        data: {
          items: [...state.items, item],
          categories,
        },
      };
    } catch (error) {
      return { ok: false, error: toErrorMessage(error, 'Unable to add item.') };
    }
  }

  async function editItem(state, payload) {
    try {
      const apiPayload = {};
      if (payload.name !== undefined) apiPayload.name = payload.name;
      if (payload.isActive !== undefined) apiPayload.is_active = payload.isActive;

      if (payload.category) {
        apiPayload.category_id = await ensureLookupId('category', payload.category);
      }
      if (payload.unit) {
        apiPayload.unit_id = await ensureLookupId('unit', payload.unit);
      }

      if (payload.emoji || payload.color || payload.attributesJson) {
        const existingItem = state.items.find((item) => item.id === payload.id);
        apiPayload.attributes_json = buildVisualAttributes(
          payload,
          payload.attributesJson || existingItem?.attributesJson || null
        );
      }

      const updated = await apiRequest(`/api/v1/items/${payload.id}`, {
        method: 'PATCH',
        auth: true,
        body: apiPayload,
      });

      const item = state.items.find((i) => i.id === payload.id);
      const merged = {
        ...item,
        ...payload,
        name: updated.name,
        isActive: updated.is_active,
        emoji: extractVisualFromAttributes(updated.attributes_json).emoji,
        color: extractVisualFromAttributes(updated.attributes_json).color,
        attributesJson: updated.attributes_json || item?.attributesJson || null,
      };
      const items = state.items.map((i) => (i.id === payload.id ? merged : i));
      return { ok: true, data: { items } };
    } catch (error) {
      return { ok: false, error: toErrorMessage(error, 'Unable to edit item.') };
    }
  }

  async function deleteItem(state, payload) {
    try {
      await apiRequest(`/api/v1/items/${payload.id}`, {
        method: 'DELETE',
        auth: true,
      });

      const items = state.items.filter((item) => item.id !== payload.id);
      const stock = Object.fromEntries(
        Object.entries(state.stock || {}).map(([warehouseId, warehouseStock]) => {
          const nextWarehouseStock = { ...(warehouseStock || {}) };
          delete nextWarehouseStock[payload.id];
          return [warehouseId, nextWarehouseStock];
        })
      );

      return { ok: true, data: { items, stock } };
    } catch (error) {
      return { ok: false, error: toErrorMessage(error, 'Unable to delete item.') };
    }
  }

  async function addWarehouse(state, payload) {
    try {
      const created = await apiRequest('/api/v1/warehouses', {
        method: 'POST',
        auth: true,
        body: {
          name: payload.name,
          address: payload.address || '',
        },
      });

      const warehouse = {
        id: created.id,
        name: created.name,
        address: created.address || '',
        lat: created.lat,
        lng: created.lng,
        isActive: created.is_active,
      };

      return {
        ok: true,
        data: {
          warehouses: [...state.warehouses, warehouse],
          stock: {
            ...state.stock,
            [warehouse.id]: {},
          },
        },
      };
    } catch (error) {
      return { ok: false, error: toErrorMessage(error, 'Unable to add warehouse.') };
    }
  }

  async function stockIn(state, payload) {
    try {
      const txn = await apiRequest('/api/v1/stock/movement', {
        method: 'POST',
        auth: true,
        body: {
          warehouse_id: payload.warehouseId,
          item_id: payload.itemId,
          quantity: payload.quantity,
          reason: 'stock_in',
          note: payload.note || '',
        },
      });

      const nextWarehouseStock = { ...(state.stock[payload.warehouseId] || {}) };
      nextWarehouseStock[payload.itemId] = (nextWarehouseStock[payload.itemId] || 0) + payload.quantity;

      const tx = mapTransactions([txn])[0];
      return {
        ok: true,
        data: {
          stock: { ...state.stock, [payload.warehouseId]: nextWarehouseStock },
          transactions: [tx, ...state.transactions],
        },
      };
    } catch (error) {
      return { ok: false, error: toErrorMessage(error, 'Unable to add stock.') };
    }
  }

  async function stockOut(state, payload) {
    try {
      const txn = await apiRequest('/api/v1/stock/movement', {
        method: 'POST',
        auth: true,
        body: {
          warehouse_id: payload.warehouseId,
          item_id: payload.itemId,
          quantity: payload.quantity,
          reason: 'stock_out',
          note: payload.note || '',
        },
      });

      const nextWarehouseStock = { ...(state.stock[payload.warehouseId] || {}) };
      const currentQty = nextWarehouseStock[payload.itemId] || 0;
      nextWarehouseStock[payload.itemId] = Math.max(currentQty - payload.quantity, 0);

      const tx = mapTransactions([txn])[0];
      return {
        ok: true,
        data: {
          stock: { ...state.stock, [payload.warehouseId]: nextWarehouseStock },
          transactions: [tx, ...state.transactions],
        },
      };
    } catch (error) {
      return { ok: false, error: toErrorMessage(error, 'Unable to remove stock.') };
    }
  }

  async function editStock(state, payload) {
    try {
      const previousQty = state.stock[payload.warehouseId]?.[payload.itemId] || 0;
      const txn = await apiRequest('/api/v1/stock/adjust', {
        method: 'POST',
        auth: true,
        body: {
          warehouse_id: payload.warehouseId,
          item_id: payload.itemId,
          new_quantity: payload.newQuantity,
          note: payload.note || '',
        },
      });

      const nextWarehouseStock = { ...(state.stock[payload.warehouseId] || {}) };
      nextWarehouseStock[payload.itemId] = payload.newQuantity;

      const mapped = mapTransactions([txn])[0];
      mapped.type = 'edit';
      mapped.previousQty = previousQty;
      mapped.quantity = payload.newQuantity;

      return {
        ok: true,
        data: {
          stock: { ...state.stock, [payload.warehouseId]: nextWarehouseStock },
          transactions: [mapped, ...state.transactions],
        },
      };
    } catch (error) {
      return { ok: false, error: toErrorMessage(error, 'Unable to edit stock.') };
    }
  }

  async function exportData(_state, options = {}) {
    try {
      const data = await apiRequest('/api/v1/data/export', {
        method: 'POST',
        auth: true,
        body: {
          format: 'json',
          include_transactions: options.includeTransactions ?? true,
          include_users: options.includeUsers ?? true,
          include_user_credentials: options.includeUserCredentials ?? false,
        },
      });

      return { ok: true, data: { snapshot: data } };
    } catch (error) {
      return { ok: false, error: toErrorMessage(error, 'Unable to export data.') };
    }
  }

  async function importDataDryRun(_state, payload, options = {}) {
    try {
      const result = await apiRequest('/api/v1/data/import/dry-run', {
        method: 'POST',
        auth: true,
        body: {
          payload,
          mode: options.mode || 'merge',
          strict: options.strict ?? true,
          include_transactions: options.includeTransactions ?? true,
          include_users: options.includeUsers ?? true,
        },
      });

      return { ok: true, data: result };
    } catch (error) {
      return { ok: false, error: toErrorMessage(error, 'Unable to validate import payload.') };
    }
  }

  async function importDataCommit(_state, payload, options = {}) {
    try {
      const result = await apiRequest('/api/v1/data/import/commit', {
        method: 'POST',
        auth: true,
        body: {
          payload,
          mode: options.mode || 'merge',
          strict: options.strict ?? true,
          include_transactions: options.includeTransactions ?? true,
          include_users: options.includeUsers ?? true,
        },
      });

      return { ok: true, data: result };
    } catch (error) {
      return { ok: false, error: toErrorMessage(error, 'Unable to import data.') };
    }
  }

  function logout() {
    setToken(null);
  }

  return {
    loadInitialData,
    login,
    createInitialManager,
    registerUser,
    resetUserPin,
    updateUser,
    addItem,
    editItem,
    deleteItem,
    addWarehouse,
    stockIn,
    stockOut,
    editStock,
    exportData,
    importDataDryRun,
    importDataCommit,
    logout,
  };
}
