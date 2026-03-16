import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import { ArrowDownToLine, ArrowUpFromLine, Clock, Filter, ChevronDown, X, PencilLine } from 'lucide-react';

function formatDateTime(timestamp) {
  const d = new Date(timestamp);
  return {
    date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  };
}

function getDateRangeStart(range) {
  const now = new Date();
  switch (range) {
    case 'today': {
      const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime();
    }
    case 'week': {
      const d = new Date(now); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); return d.getTime();
    }
    case 'month': {
      const d = new Date(now); d.setDate(d.getDate() - 30); d.setHours(0, 0, 0, 0); return d.getTime();
    }
    default: return 0;
  }
}

export default function HistoryPage() {
  const { transactions: allTransactions, items, warehouses, users, selectedWarehouseId } = useApp();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterWarehouse, setFilterWarehouse] = useState(selectedWarehouseId || 'all');
  const [filterUser, setFilterUser] = useState('all');
  const [filterItem, setFilterItem] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortCol, setSortCol] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  const transactions = useMemo(() => {
    let txns = [...allTransactions];
    if (filterWarehouse !== 'all') txns = txns.filter((t) => t.warehouseId === filterWarehouse);
    if (filterItem !== 'all') txns = txns.filter((t) => t.itemId === filterItem);
    return txns;
  }, [allTransactions, filterWarehouse, filterItem]);

  const filtered = useMemo(() => {
    let result = [...transactions];

    if (filterType !== 'all') {
      result = result.filter((t) => t.type === filterType);
    }
    if (filterUser !== 'all') {
      result = result.filter((t) => t.userId === filterUser);
    }
    if (filterDateRange !== 'all') {
      const rangeStart = getDateRangeStart(filterDateRange);
      result = result.filter((t) => t.createdAt >= rangeStart);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) => {
        const item = items.find((i) => i.id === t.itemId);
        const user = users.find((u) => u.id === t.userId);
        return (
          item?.name.toLowerCase().includes(q) ||
          user?.displayName.toLowerCase().includes(q) ||
          t.note?.toLowerCase().includes(q)
        );
      });
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'date': cmp = a.createdAt - b.createdAt; break;
        case 'item': {
          const na = items.find((i) => i.id === a.itemId)?.name || '';
          const nb = items.find((i) => i.id === b.itemId)?.name || '';
          cmp = na.localeCompare(nb); break;
        }
        case 'user': {
          const ua = users.find((u) => u.id === a.userId)?.displayName || '';
          const ub = users.find((u) => u.id === b.userId)?.displayName || '';
          cmp = ua.localeCompare(ub); break;
        }
        case 'qty': cmp = a.quantity - b.quantity; break;
        case 'type': cmp = a.type.localeCompare(b.type); break;
        default: cmp = a.createdAt - b.createdAt;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [transactions, filterType, filterUser, filterDateRange, search, items, users, sortCol, sortDir]);

  const getItem = (id) => items.find((i) => i.id === id);
  const getWarehouse = (id) => warehouses.find((w) => w.id === id);
  const getUser = (id) => users.find((u) => u.id === id);

  const activeFilterCount = [
    filterType !== 'all',
    filterWarehouse !== 'all',
    filterUser !== 'all',
    filterItem !== 'all',
    filterDateRange !== 'all',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilterType('all');
    setFilterWarehouse('all');
    setFilterUser('all');
    setFilterItem('all');
    setFilterDateRange('all');
    setSearch('');
  };

  return (
    <div className="page">
      <Header title="History" subtitle="Transaction log" />

      <div className="page-content">
        <SearchBar value={search} onChange={setSearch} placeholder="Search items, users, notes..." />

        {/* Filter toggle + type pills */}
        <div className="history-toolbar">
          <div className="filter-pills">
            <button
              className={`pill ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All
            </button>
            <button
              className={`pill pill-in ${filterType === 'in' ? 'active' : ''}`}
              onClick={() => setFilterType('in')}
            >
              <ArrowDownToLine size={14} /> In
            </button>
            <button
              className={`pill pill-out ${filterType === 'out' ? 'active' : ''}`}
              onClick={() => setFilterType('out')}
            >
              <ArrowUpFromLine size={14} /> Out
            </button>
            <button
              className={`pill pill-edit ${filterType === 'edit' ? 'active' : ''}`}
              onClick={() => setFilterType('edit')}
            >
              <PencilLine size={14} /> Edit
            </button>
          </div>
          <button
            className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filters
            {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
          </button>
        </div>

        {/* Expanded filter panel */}
        {showFilters && (
          <div className="filter-panel">
            <div className="filter-panel-row">
              <div className="filter-group">
                <label>Time Period</label>
                <select value={filterDateRange} onChange={(e) => setFilterDateRange(e.target.value)}>
                  <option value="all">All time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 days</option>
                  <option value="month">Last 30 days</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Warehouse</label>
                <select
                  value={filterWarehouse}
                  onChange={(e) => setFilterWarehouse(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                >
                  <option value="all">All</option>
                  {warehouses.filter((w) => w.isActive).map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="filter-panel-row">
              <div className="filter-group">
                <label>User</label>
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                >
                  <option value="all">All users</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.displayName}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Product</label>
                <select
                  value={filterItem}
                  onChange={(e) => setFilterItem(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                >
                  <option value="all">All items</option>
                  {items.filter((i) => i.isActive).map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {activeFilterCount > 0 && (
              <button className="clear-filters-btn" onClick={clearFilters}>
                <X size={14} /> Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Sort + count bar */}
        <div className="history-sort-bar">
          <span className="history-count">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</span>
          <div className="sort-control">
            <span className="sort-label">Sort:</span>
            <select
              value={sortCol}
              onChange={(e) => setSortCol(e.target.value)}
              className="sort-select"
            >
              <option value="date">Date</option>
              <option value="item">Item</option>
              <option value="qty">Quantity</option>
              <option value="user">User</option>
              <option value="type">Type</option>
            </select>
            <button
              className="sort-dir-btn"
              onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
              title={sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
            >
              <ChevronDown size={14} className={sortDir === 'asc' ? 'sort-dir-flipped' : ''} />
            </button>
          </div>
        </div>

        {/* Transaction cards */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Clock size={40} />
            <p>No transactions found</p>
          </div>
        ) : (
          <div className="txn-card-list">
            {filtered.map((txn) => {
              const item = getItem(txn.itemId);
              const warehouse = getWarehouse(txn.warehouseId);
              const user = getUser(txn.userId);
              const isIn = txn.type === 'in';
              const isEdit = txn.type === 'edit';
              const dt = formatDateTime(txn.createdAt);

              return (
                <div key={txn.id} className={`txn-card ${isIn ? 'txn-card-in' : isEdit ? 'txn-card-edit' : 'txn-card-out'}`}>
                  {/* Row 1: Date/Time left, Type badge + Qty right */}
                  <div className="txn-card-top">
                    <span className="txn-card-datetime">{dt.date} · {dt.time}</span>
                    <div className="txn-card-right">
                      <span className={`type-badge ${isIn ? 'badge-in' : isEdit ? 'badge-edit' : 'badge-out'}`}>
                        {isIn ? <ArrowDownToLine size={11} /> : isEdit ? <PencilLine size={11} /> : <ArrowUpFromLine size={11} />}
                        {isIn ? 'IN' : isEdit ? 'EDIT' : 'OUT'}
                      </span>
                      {isEdit ? (
                        <span className="txn-card-qty qty-edit">
                          {txn.previousQty} → {txn.quantity}
                          <span className="txn-card-unit">{item?.unit}</span>
                        </span>
                      ) : (
                        <span className={`txn-card-qty ${isIn ? 'qty-in' : 'qty-out'}`}>
                          {isIn ? '+' : '−'}{txn.quantity}
                          <span className="txn-card-unit">{item?.unit}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Row 2: Item left, User right */}
                  <div className="txn-card-mid">
                    <div className="txn-card-item">
                      <span className="txn-card-emoji">{item?.emoji || '📦'}</span>
                      <span className="txn-card-item-name">{item?.name || '?'}</span>
                      {filterWarehouse === 'all' && warehouse && (
                        <span className="txn-card-wh">@ {warehouse.name}</span>
                      )}
                    </div>
                    <div className="txn-card-user">
                      <span className="txn-card-avatar">{user?.displayName?.[0]}</span>
                      <span className="txn-card-username">{user?.displayName}</span>
                    </div>
                  </div>
                  {/* Row 3: Note (optional) */}
                  {txn.note && (
                    <div className="txn-card-note">💬 {txn.note}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
