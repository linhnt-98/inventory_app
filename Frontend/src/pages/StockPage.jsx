import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import StockModal from '../components/StockModal';
import Toast from '../components/Toast';
import { ArrowDownToLine, ArrowUpFromLine, Filter } from 'lucide-react';

export default function StockPage() {
  const {
    selectedWarehouseId,
    warehouses,
    getStockForWarehouse,
    stockIn,
    stockOut,
    categories,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'qty-low' | 'qty-high'
  const [modalItem, setModalItem] = useState(null);
  const [modalMode, setModalMode] = useState('in');
  const [toast, setToast] = useState(null);

  const warehouse = warehouses.find((w) => w.id === selectedWarehouseId);
  const allStock = useMemo(
    () => getStockForWarehouse(selectedWarehouseId),
    [selectedWarehouseId, getStockForWarehouse]
  );

  const filteredStock = useMemo(() => {
    let result = allStock;

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory !== 'All') {
      result = result.filter((item) => item.category === selectedCategory);
    }

    // Sort
    if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'qty-low') result.sort((a, b) => a.quantity - b.quantity);
    if (sortBy === 'qty-high') result.sort((a, b) => b.quantity - a.quantity);

    return result;
  }, [allStock, search, selectedCategory, sortBy]);

  const openModal = (item, mode) => {
    setModalItem(item);
    setModalMode(mode);
  };

  const handleConfirm = async (quantity, note) => {
    if (modalMode === 'in') {
      const result = await stockIn(selectedWarehouseId, modalItem.id, quantity, note);
      if (!result.ok) {
        setToast({ message: result.error || 'Unable to add stock.', type: 'out' });
        return;
      }
      setToast({ message: `Added ${quantity} ${modalItem.unit} of ${modalItem.name}`, type: 'success' });
    } else {
      const result = await stockOut(selectedWarehouseId, modalItem.id, quantity, note);
      if (!result.ok) {
        setToast({ message: result.error || 'Unable to remove stock.', type: 'out' });
        return;
      }
      setToast({ message: `Removed ${quantity} ${modalItem.unit} of ${modalItem.name}`, type: 'out' });
    }
    setModalItem(null);
  };

  if (!warehouse) {
    return (
      <div className="page">
        <Header title="Stock" subtitle="Select a warehouse first" showBack backTo="/dashboard" />
        <div className="page-content empty-state">
          <p>Please select a warehouse from the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Header title={warehouse.name} subtitle="Current Stock" showBack backTo="/dashboard" />

      <div className="page-content">
        <SearchBar value={search} onChange={setSearch} placeholder="Search items..." />

        {/* Category filter pills */}
        <div className="filter-row">
          <div className="filter-pills">
            <button
              className={`pill ${selectedCategory === 'All' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('All')}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`pill ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name">A → Z</option>
            <option value="qty-low">Low Stock First</option>
            <option value="qty-high">High Stock First</option>
          </select>
        </div>

        {/* Stock list */}
        <div className="stock-list">
          {filteredStock.length === 0 ? (
            <div className="empty-state">
              <p>No items found</p>
            </div>
          ) : (
            filteredStock.map((item) => (
              <div key={item.id} className="stock-item">
                <div className="item-thumb" style={{ background: item.color || '#e5e7eb' }}>
                  <span className="item-emoji">{item.emoji || '📦'}</span>
                </div>
                <div className="stock-item-info">
                  <h3 className="stock-item-name">{item.name}</h3>
                  <span className="stock-item-category">{item.category}</span>
                </div>

                <div className="stock-item-right">
                  <div className={`stock-qty ${item.quantity <= 5 ? 'low' : ''} ${item.quantity === 0 ? 'zero' : ''}`}>
                    <span className="qty-number">{item.quantity}</span>
                    <span className="qty-unit">{item.unit}</span>
                  </div>

                  <div className="stock-actions">
                    <button
                      className="action-btn action-in"
                      onClick={() => openModal(item, 'in')}
                      title="Stock In"
                    >
                      <ArrowDownToLine size={18} />
                      <span>In</span>
                    </button>
                    <button
                      className="action-btn action-out"
                      onClick={() => openModal(item, 'out')}
                      title="Stock Out"
                      disabled={item.quantity === 0}
                    >
                      <ArrowUpFromLine size={18} />
                      <span>Out</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="list-count">{filteredStock.length} items</div>
      </div>

      {/* Stock In/Out Modal */}
      {modalItem && (
        <StockModal
          item={modalItem}
          mode={modalMode}
          currentQty={modalItem.quantity}
          onConfirm={handleConfirm}
          onClose={() => setModalItem(null)}
        />
      )}

      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
