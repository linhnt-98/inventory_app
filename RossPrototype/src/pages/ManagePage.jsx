import { useState } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import { Plus, Edit2, Package, MapPin, X } from 'lucide-react';

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

export default function ManagePage() {
  const { items, warehouses, categories, addItem, addWarehouse, currentUser } = useApp();
  const [tab, setTab] = useState('items');
  const [search, setSearch] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);

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
    </div>
  );
}
