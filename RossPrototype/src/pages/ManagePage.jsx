import { useState } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import { Plus, Edit2, Package, MapPin, X, Users, ShieldCheck, ShieldOff, UserCheck, UserX, UserPlus, Copy, Check, RefreshCw } from 'lucide-react';

function AddItemModal({ categories, onAdd, onClose }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0] || '');
  const [unit, setUnit] = useState('bags');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), category, unit });
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
          />

          <label className="modal-label">Category</label>
          <select className="modal-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label className="modal-label">Unit</label>
          <select className="modal-input" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {['bags', 'boxes', 'tins', 'pcs', 'kg', 'bottles'].map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim()}>Add Item</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddWarehouseModal({ onAdd, onClose }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), address: address.trim() });
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
          />

          <label className="modal-label">Address (optional)</label>
          <input
            className="modal-input"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 100 Warehouse Rd"
          />

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim()}>Add Warehouse</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `INV-${seg()}-${seg()}`;
}

function InviteModal({ onClose }) {
  const [role, setRole] = useState('staff');
  const [code, setCode] = useState(generateCode);
  const [copied, setCopied] = useState(false);

  const inviteText = `Join Jason's Tea Shop inventory system!\nInvite code: ${code}\nRole: ${role === 'manager' ? 'Manager' : 'Staff'}\n\nUse this code when signing up to get started.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <div className="modal-header">
          <h2>Invite Team Member</h2>
        </div>
        <div className="modal-body">
          <label className="modal-label">Role for new member</label>
          <select className="modal-input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
          </select>

          <label className="modal-label" style={{ marginTop: 16 }}>Invite code</label>
          <div className="invite-code-box">
            <span className="invite-code-text">{code}</span>
            <button
              className="invite-regen-btn"
              title="Generate new code"
              onClick={() => { setCode(generateCode()); setCopied(false); }}
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <p className="invite-hint">
            Share this code with the team member. They can enter it on the Sign Up screen to join with the <strong>{role === 'manager' ? 'Manager' : 'Staff'}</strong> role.
          </p>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
            <button type="button" className="btn btn-primary btn-icon" onClick={handleCopy}>
              {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Invite</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ManagePage() {
  const { items, warehouses, categories, users, addItem, addWarehouse, updateUser, currentUser } = useApp();
  const [tab, setTab] = useState('items');
  const [search, setSearch] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

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

  return (
    <div className="page">
      <Header title="Manage" subtitle="Items & Warehouses" />

      <div className="page-content">
        {/* Tab switcher */}
        <div className="tab-bar">
          <button
            className={`tab ${tab === 'items' ? 'active' : ''}`}
            onClick={() => { setTab('items'); setSearch(''); }}
          >
            <Package size={16} /> Items ({items.filter((i) => i.isActive).length})
          </button>
          <button
            className={`tab ${tab === 'warehouses' ? 'active' : ''}`}
            onClick={() => { setTab('warehouses'); setSearch(''); }}
          >
            <MapPin size={16} /> Warehouses ({activeWarehouses.length})
          </button>
          <button
            className={`tab ${tab === 'staff' ? 'active' : ''}`}
            onClick={() => { setTab('staff'); setSearch(''); }}
          >
            <Users size={16} /> Staff ({users.length})
          </button>
        </div>

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
                  <button className="btn-ghost" title="Edit">
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
                  <button className="btn-ghost" title="Edit">
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
                <SearchBar value={search} onChange={setSearch} placeholder="Search staff..." />
                <button className="btn btn-primary btn-icon" onClick={() => setShowInvite(true)}>
                  <UserPlus size={18} /> Invite
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
                        {/* Toggle role */}
                        <button
                          className="btn-ghost staff-action-btn"
                          title={isManager ? 'Downgrade to Staff' : 'Promote to Manager'}
                          disabled={isSelf || isLastManager}
                          onClick={() => updateUser(user.id, { role: isManager ? 'staff' : 'manager' })}
                        >
                          {isManager ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
                        </button>

                        {/* Toggle active status */}
                        <button
                          className="btn-ghost staff-action-btn"
                          title={isActive ? 'Deactivate account' : 'Activate account'}
                          disabled={isSelf}
                          onClick={() => updateUser(user.id, { isActive: !isActive })}
                        >
                          {isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="list-count">{filteredUsers.length} staff member{filteredUsers.length !== 1 ? 's' : ''}</div>
            </>
          );
        })()}
      </div>

      {showAddItem && (
        <AddItemModal
          categories={categories}
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

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  );
}
