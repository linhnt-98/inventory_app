import { useState } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import {
  Plus,
  Edit2,
  Package,
  MapPin,
  X,
  Users,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserX,
  UserPlus,
  Upload,
  Download,
  Database,
} from 'lucide-react';

function AddItemModal({ categories, onAdd, onClose }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Tea');
  const [unit, setUnit] = useState('bags');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError('');
    const result = await onAdd({ name: name.trim(), category, unit });
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error || 'Unable to add item.');
      return;
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <div className="modal-header">
          <h2>Add New Item</h2>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <label className="modal-label">Item Name</label>
          <input
            className="modal-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jasmine Green Tea 250g"
            autoFocus
            disabled={isSubmitting}
          />

          <label className="modal-label">Category</label>
          <select
            className="modal-input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isSubmitting}
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label className="modal-label">Unit</label>
          <select
            className="modal-input"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            disabled={isSubmitting}
          >
            {['bags', 'boxes', 'tins', 'pcs', 'kg', 'bottles'].map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim() || isSubmitting}>Add Item</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddWarehouseModal({ onAdd, onClose }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError('');
    const result = await onAdd({ name: name.trim(), address: address.trim() });
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error || 'Unable to add warehouse.');
      return;
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <div className="modal-header">
          <h2>Add Warehouse</h2>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <label className="modal-label">Warehouse Name</label>
          <input
            className="modal-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. North Storage"
            autoFocus
            disabled={isSubmitting}
          />

          <label className="modal-label">Address (optional)</label>
          <input
            className="modal-input"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 100 Warehouse Rd"
            disabled={isSubmitting}
          />

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim() || isSubmitting}>Add Warehouse</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddUserModal({ onAdd, onClose }) {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('staff');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!displayName.trim()) return setError('Display name is required.');
    if (!username.trim()) return setError('Username is required.');
    if (pin.length !== 4) return setError('PIN must be 4 digits.');
    if (pin !== confirmPin) return setError('PINs do not match.');

    setIsSubmitting(true);
    setError('');

    const result = await onAdd({
      displayName: displayName.trim(),
      username: username.trim(),
      role,
      pin,
    });

    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error || 'Unable to add user.');
      return;
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <div className="modal-header">
          <h2>Add Team Member</h2>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <label className="modal-label">Display Name</label>
          <input
            className="modal-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={isSubmitting}
          />

          <label className="modal-label">Username</label>
          <input
            className="modal-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isSubmitting}
          />

          <label className="modal-label">Role</label>
          <select className="modal-input" value={role} onChange={(e) => setRole(e.target.value)} disabled={isSubmitting}>
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
          </select>

          <label className="modal-label">PIN</label>
          <input
            className="modal-input"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            disabled={isSubmitting}
          />

          <label className="modal-label">Confirm PIN</label>
          <input
            className="modal-input"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            disabled={isSubmitting}
          />

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>Add User</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ManagePage() {
  const {
    items,
    warehouses,
    categories,
    users,
    addItem,
    addWarehouse,
    register,
    updateUser,
    exportData,
    importDataDryRun,
    importDataCommit,
    currentUser,
    apiError,
  } = useApp();

  const [tab, setTab] = useState('items');
  const [search, setSearch] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [actionError, setActionError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImportDryRunning, setIsImportDryRunning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [importPayload, setImportPayload] = useState(null);
  const [dryRunResult, setDryRunResult] = useState(null);

  if (currentUser?.role !== 'manager') {
    return (
      <div className="page">
        <Header title="Manage" subtitle="Admin access required" />
        <div className="page-content empty-state">
          <p>🔒 Only managers can access this section.</p>
        </div>
      </div>
    );
  }

  const filteredItems = items.filter((item) =>
    item.isActive && item.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeWarehouses = warehouses.filter((w) => w.isActive);

  const handleToggleRole = async (user, managerCount) => {
    if (user.id === currentUser.id) return;
    if (user.role === 'manager' && managerCount === 1) return;

    setActionError('');
    const result = await updateUser(user.id, { role: user.role === 'manager' ? 'staff' : 'manager' });
    if (!result.ok) setActionError(result.error || 'Unable to update role.');
  };

  const handleToggleActive = async (user) => {
    if (user.id === currentUser.id) return;

    setActionError('');
    const result = await updateUser(user.id, { isActive: user.isActive === false });
    if (!result.ok) setActionError(result.error || 'Unable to update status.');
  };

  const handleExport = async () => {
    setActionError('');
    setIsExporting(true);

    const result = await exportData({
      includeTransactions: true,
      includeUsers: true,
      includeUserCredentials: false,
    });

    setIsExporting(false);

    if (!result.ok) {
      setActionError(result.error || 'Unable to export data.');
      return;
    }

    const snapshot = result.data?.snapshot;
    if (!snapshot) {
      setActionError('Export returned empty payload.');
      return;
    }

    const exportedAt = snapshot?.meta?.exported_at || new Date().toISOString();
    const timestamp = exportedAt.replace(/[:.]/g, '-');
    const schemaVersion = snapshot?.meta?.app_schema_version || 'unknown-schema';
    const filename = `inventory_export_${schemaVersion}_${timestamp}.json`;

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setActionError('');
    setDryRunResult(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setImportText(text);
      setImportPayload(parsed);
    } catch {
      setImportText('');
      setImportPayload(null);
      setActionError('Invalid JSON file. Please upload a valid export snapshot.');
    }

    event.target.value = '';
  };

  const handleDryRun = async () => {
    if (!importPayload) {
      setActionError('Upload a snapshot JSON first.');
      return;
    }

    setActionError('');
    setIsImportDryRunning(true);

    const result = await importDataDryRun(importPayload, {
      mode: 'merge',
      strict: true,
      includeTransactions: true,
      includeUsers: true,
    });

    setIsImportDryRunning(false);

    if (!result.ok) {
      setDryRunResult(null);
      setActionError(result.error || 'Import dry-run failed.');
      return;
    }

    setDryRunResult(result.data);
  };

  const handleCommitImport = async () => {
    if (!importPayload) {
      setActionError('Upload a snapshot JSON first.');
      return;
    }

    if (!dryRunResult?.ok) {
      setActionError('Run a successful dry-run before commit.');
      return;
    }

    if ((dryRunResult.errors || []).length > 0) {
      setActionError('Resolve dry-run errors before commit.');
      return;
    }

    const confirmed = window.confirm('This will merge imported data into the current database. Continue?');
    if (!confirmed) return;

    setActionError('');
    setIsImporting(true);

    const result = await importDataCommit(importPayload, {
      mode: 'merge',
      strict: true,
      includeTransactions: true,
      includeUsers: true,
    });

    setIsImporting(false);

    if (!result.ok) {
      setActionError(result.error || 'Import failed.');
      return;
    }

    setDryRunResult(null);
    setImportPayload(null);
    setImportText('');
  };

  return (
    <div className="page">
      <Header title="Manage" subtitle="Items, Warehouses, and Team" />

      <div className="page-content">
        <div className="tab-bar">
          <button
            className={`tab ${tab === 'items' ? 'active' : ''}`}
            onClick={() => {
              setTab('items');
              setSearch('');
            }}
          >
            <Package size={16} /> Items ({items.filter((i) => i.isActive).length})
          </button>
          <button
            className={`tab ${tab === 'warehouses' ? 'active' : ''}`}
            onClick={() => {
              setTab('warehouses');
              setSearch('');
            }}
          >
            <MapPin size={16} /> Warehouses ({activeWarehouses.length})
          </button>
          <button
            className={`tab ${tab === 'staff' ? 'active' : ''}`}
            onClick={() => {
              setTab('staff');
              setSearch('');
            }}
          >
            <Users size={16} /> Team ({users.length})
          </button>
          <button
            className={`tab ${tab === 'data' ? 'active' : ''}`}
            onClick={() => {
              setTab('data');
              setSearch('');
            }}
          >
            <Database size={16} /> Data
          </button>
        </div>

        {(actionError || apiError) && <p className="form-error">{actionError || apiError}</p>}

        {tab === 'items' && (
          <>
            <div className="manage-toolbar">
              <SearchBar value={search} onChange={setSearch} placeholder="Search items..." />
              <button className="btn btn-primary btn-icon" onClick={() => setShowAddItem(true)}>
                <Plus size={18} /> Add Item
              </button>
            </div>

            <div className="manage-list">
              {filteredItems.map((item) => (
                <div key={item.id} className="manage-item">
                  <div className="manage-item-info">
                    <h3>{item.name}</h3>
                    <span className="manage-item-meta">{item.category} · {item.unit}</span>
                  </div>
                  <button className="btn-ghost" title="Edit" disabled>
                    <Edit2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="list-count">{filteredItems.length} items</div>
          </>
        )}

        {tab === 'warehouses' && (
          <>
            <div className="manage-toolbar">
              <div style={{ flex: 1 }} />
              <button className="btn btn-primary btn-icon" onClick={() => setShowAddWarehouse(true)}>
                <Plus size={18} /> Add Warehouse
              </button>
            </div>

            <div className="manage-list">
              {activeWarehouses.map((w) => (
                <div key={w.id} className="manage-item">
                  <div className="manage-item-info">
                    <h3>{w.name}</h3>
                    <span className="manage-item-meta">{w.address || 'No address'}</span>
                  </div>
                  <button className="btn-ghost" title="Edit" disabled>
                    <Edit2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="list-count">{activeWarehouses.length} warehouses</div>
          </>
        )}

        {tab === 'staff' && (() => {
          const managerCount = users.filter((u) => u.role === 'manager').length;
          const filteredUsers = users.filter((u) =>
            u.displayName.toLowerCase().includes(search.toLowerCase()) ||
            u.username.toLowerCase().includes(search.toLowerCase())
          );

          return (
            <>
              <div className="manage-toolbar">
                <SearchBar value={search} onChange={setSearch} placeholder="Search team..." />
                <button className="btn btn-primary btn-icon" onClick={() => setShowAddUser(true)}>
                  <UserPlus size={18} /> Add User
                </button>
              </div>

              <div className="manage-list">
                {filteredUsers.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  const isActive = user.isActive !== false;
                  const isManager = user.role === 'manager';
                  const isLastManager = isManager && managerCount === 1;

                  return (
                    <div key={user.id} className={`manage-item staff-card ${!isActive ? 'staff-card-inactive' : ''}`}>
                      <div className={`staff-avatar staff-avatar-${(user.id % 5) + 1}`}>
                        {user.displayName[0].toUpperCase()}
                      </div>

                      <div className="manage-item-info">
                        <div className="staff-name-row">
                          <h3>{user.displayName}</h3>
                          <span className={`staff-role-badge ${isManager ? 'badge-manager' : 'badge-staff'}`}>
                            {isManager ? 'Manager' : 'Staff'}
                          </span>
                          {!isActive && <span className="staff-inactive-badge">Inactive</span>}
                        </div>
                        <span className="manage-item-meta">@{user.username}</span>
                      </div>

                      <div className="staff-actions">
                        <button
                          className="btn-ghost staff-action-btn"
                          title={isManager ? 'Downgrade to Staff' : 'Promote to Manager'}
                          disabled={isSelf || isLastManager}
                          onClick={() => handleToggleRole(user, managerCount)}
                        >
                          {isManager ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
                        </button>

                        <button
                          className="btn-ghost staff-action-btn"
                          title={isActive ? 'Deactivate account' : 'Activate account'}
                          disabled={isSelf}
                          onClick={() => handleToggleActive(user)}
                        >
                          {isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="list-count">{filteredUsers.length} team member{filteredUsers.length !== 1 ? 's' : ''}</div>
            </>
          );
        })()}

        {tab === 'data' && (
          <>
            <div className="manage-toolbar">
              <div className="data-io-actions">
                <button
                  className="btn btn-primary btn-icon"
                  onClick={handleExport}
                  disabled={isExporting || isImportDryRunning || isImporting}
                >
                  <Download size={18} /> {isExporting ? 'Exporting...' : 'Export Snapshot JSON'}
                </button>

                <label className="btn btn-secondary btn-icon" htmlFor="import-file-input">
                  <Upload size={18} /> Upload Snapshot JSON
                </label>
                <input
                  id="import-file-input"
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportFile}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            <div className="manage-list">
              <div className="manage-item data-io-card">
                <div className="manage-item-info">
                  <h3>Import Preview</h3>
                  <span className="manage-item-meta">
                    {importPayload ? 'Snapshot loaded. Run dry-run to validate.' : 'No file loaded yet.'}
                  </span>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={handleDryRun}
                  disabled={!importPayload || isImportDryRunning || isImporting}
                >
                  {isImportDryRunning ? 'Validating...' : 'Run Dry-Run'}
                </button>
              </div>

              {dryRunResult && (
                <div className="manage-item data-io-report">
                  <div className="manage-item-info">
                    <h3>Dry-Run Result</h3>
                    <span className="manage-item-meta">
                      Errors: {(dryRunResult.errors || []).length} · Warnings: {(dryRunResult.warnings || []).length}
                    </span>
                    <span className="manage-item-meta">
                      Items: {dryRunResult.summary?.entity_counts?.items ?? 0} · Warehouses: {dryRunResult.summary?.entity_counts?.warehouses ?? 0} · Transactions: {dryRunResult.summary?.entity_counts?.stock_transactions ?? 0}
                    </span>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={handleCommitImport}
                    disabled={isImporting || (dryRunResult.errors || []).length > 0}
                  >
                    {isImporting ? 'Importing...' : 'Commit Import'}
                  </button>
                </div>
              )}

              {importText && (
                <div className="manage-item data-io-text-preview">
                  <div className="manage-item-info">
                    <h3>Loaded Snapshot</h3>
                    <span className="manage-item-meta">Preview (first 800 chars)</span>
                    <pre className="data-io-pre">{importText.slice(0, 800)}{importText.length > 800 ? '…' : ''}</pre>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showAddItem && (
        <AddItemModal
          categories={categories.length ? categories : ['Tea']}
          onAdd={addItem}
          onClose={() => setShowAddItem(false)}
        />
      )}

      {showAddWarehouse && (
        <AddWarehouseModal
          onAdd={addWarehouse}
          onClose={() => setShowAddWarehouse(false)}
        />
      )}

      {showAddUser && (
        <AddUserModal
          onAdd={register}
          onClose={() => setShowAddUser(false)}
        />
      )}
    </div>
  );
}
