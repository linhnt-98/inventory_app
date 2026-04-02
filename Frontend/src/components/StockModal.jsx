import { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';

export default function StockModal({ item, mode, currentQty, onConfirm, onClose }) {
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');

  const isOut = mode === 'out';
  const maxQty = isOut ? currentQty : 9999;
  const wouldGoBelowZero = isOut && quantity > currentQty;

  const handleConfirm = () => {
    if (quantity < 1 || wouldGoBelowZero) return;
    onConfirm(quantity, note);
  };

  const adjust = (delta) => {
    setQuantity((q) => Math.max(1, Math.min(maxQty, q + delta)));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className={`modal-header ${isOut ? 'stock-out' : 'stock-in'}`}>
          <span className="modal-badge">{isOut ? 'STOCK OUT' : 'STOCK IN'}</span>
          <h2 className="modal-item-name">{item.name}</h2>
          <p className="modal-item-detail">
            {item.category} · Current: {currentQty} {item.unit}
          </p>
        </div>

        <div className="modal-body">
          <label className="modal-label">Quantity ({item.unit})</label>
          <div className="quantity-control">
            <button className="qty-btn" onClick={() => adjust(-1)} disabled={quantity <= 1}>
              <Minus size={20} />
            </button>
            <input
              type="number"
              className="qty-input"
              value={quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                setQuantity(Math.max(0, Math.min(maxQty, val)));
              }}
              min={1}
              max={maxQty}
            />
            <button className="qty-btn" onClick={() => adjust(1)} disabled={quantity >= maxQty}>
              <Plus size={20} />
            </button>
          </div>

          {/* Quick quantity buttons */}
          <div className="quick-qty">
            {[1, 5, 10, 25].map((q) => (
              <button
                key={q}
                className={`quick-qty-btn ${quantity === q ? 'selected' : ''}`}
                onClick={() => setQuantity(Math.min(q, maxQty))}
              >
                {q}
              </button>
            ))}
          </div>

          {wouldGoBelowZero && (
            <p className="modal-warning">⚠️ Only {currentQty} {item.unit} available</p>
          )}

          <label className="modal-label">Note (optional)</label>
          <input
            type="text"
            className="modal-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isOut ? 'e.g. Taking to Downtown Shop' : 'e.g. Spring shipment'}
          />

          {/* Preview */}
          <div className="modal-preview">
            <span>New stock level:</span>
            <span className="modal-preview-qty">
              {isOut ? currentQty - quantity : currentQty + quantity} {item.unit}
            </span>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`btn ${isOut ? 'btn-danger' : 'btn-success'}`}
            onClick={handleConfirm}
            disabled={quantity < 1 || wouldGoBelowZero}
          >
            {isOut ? `Remove ${quantity}` : `Add ${quantity}`}
          </button>
        </div>
      </div>
    </div>
  );
}
