import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import { MapPin, ChevronRight, Package } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom green pin icon
function createPinIcon(isActive) {
  return L.divIcon({
    className: 'custom-pin',
    html: `<div class="map-pin ${isActive ? 'map-pin-active' : ''}">
      <svg width="32" height="42" viewBox="0 0 28 36" fill="none">
        <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="${isActive ? '#16a34a' : '#166534'}"/>
        <circle cx="14" cy="13" r="5" fill="white"/>
      </svg>
    </div>`,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  });
}

// Component to fit map bounds to all markers
function FitBounds({ warehouses }) {
  const map = useMap();
  useEffect(() => {
    if (warehouses.length > 0) {
      const bounds = L.latLngBounds(warehouses.map((w) => [w.lat, w.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [map, warehouses]);
  return null;
}

export default function DashboardPage() {
  const { warehouses, currentUser, selectWarehouse, stock, items } = useApp();
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState(null);

  const activeWarehouses = warehouses.filter((w) => w.isActive);
  const mappableWarehouses = activeWarehouses.filter(
    (w) => typeof w.lat === 'number' && typeof w.lng === 'number'
  );

  const handleSelectWarehouse = (id) => {
    selectWarehouse(id);
    navigate('/stock');
  };

  const getWarehouseStats = (warehouseId) => {
    const wStock = stock[warehouseId] || {};
    let totalItems = 0;
    let lowStock = 0;
    let totalQty = 0;
    items.forEach((item) => {
      if (!item.isActive) return;
      const qty = wStock[item.id] || 0;
      if (qty > 0) totalItems++;
      if (qty > 0 && qty <= 5) lowStock++;
      totalQty += qty;
    });
    return { totalItems, lowStock, totalQty };
  };

  return (
    <div className="page">
      <Header
        title={`Hi, ${currentUser?.displayName} 👋`}
        subtitle="Select a warehouse to get started"
      />

      <div className="page-content">
        {/* Map — always visible */}
        <div className="map-container">
          <MapContainer
            center={[40.7160, -73.9960]}
            zoom={13}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', borderRadius: '12px' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds warehouses={mappableWarehouses} />
            {mappableWarehouses.map((warehouse) => {
              const stats = getWarehouseStats(warehouse.id);
              return (
                <Marker
                  key={warehouse.id}
                  position={[warehouse.lat, warehouse.lng]}
                  icon={createPinIcon(hoveredId === warehouse.id)}
                  eventHandlers={{
                    click: () => handleSelectWarehouse(warehouse.id),
                  }}
                >
                  <Popup>
                    <div className="map-popup">
                      <strong>{warehouse.name}</strong>
                      <span>{warehouse.address}</span>
                      <span>{stats.totalItems} items · {stats.totalQty} total units</span>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleSelectWarehouse(warehouse.id)}
                      >
                        Open →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        <div className="section-label" style={{ marginTop: 16 }}>
          Tap a pin or select below
        </div>

        {/* Warehouse cards — always visible */}
        <div className="warehouse-list">
          {activeWarehouses.map((warehouse) => {
            const stats = getWarehouseStats(warehouse.id);
            return (
              <button
                key={warehouse.id}
                className={`warehouse-card ${hoveredId === warehouse.id ? 'highlighted' : ''}`}
                onClick={() => handleSelectWarehouse(warehouse.id)}
                onMouseEnter={() => setHoveredId(warehouse.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="warehouse-icon">
                  <MapPin size={24} />
                </div>
                <div className="warehouse-info">
                  <h3>{warehouse.name}</h3>
                  <p className="warehouse-address">{warehouse.address}</p>
                  <div className="warehouse-stats">
                    <span className="stat">
                      <Package size={14} /> {stats.totalItems} items · {stats.totalQty} units
                    </span>
                    {stats.lowStock > 0 && (
                      <span className="stat stat-warn">⚠ {stats.lowStock} low</span>
                    )}
                  </div>
                </div>
                <ChevronRight size={20} className="warehouse-arrow" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
