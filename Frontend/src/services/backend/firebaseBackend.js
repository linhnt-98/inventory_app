function notImplemented() {
  throw new Error('Firebase backend adapter is not implemented yet. Set VITE_BACKEND_PROVIDER=local for now.');
}

export function createFirebaseBackend() {
  return {
    loadInitialData: notImplemented,
    persistUsers: notImplemented,
    login: notImplemented,
    createInitialManager: notImplemented,
    registerUser: notImplemented,
    resetUserPin: notImplemented,
    updateUser: notImplemented,
    addItem: notImplemented,
    editItem: notImplemented,
    addWarehouse: notImplemented,
    stockIn: notImplemented,
    stockOut: notImplemented,
    editStock: notImplemented,
  };
}
