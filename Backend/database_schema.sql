PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('manager', 'employee')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warehouses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  location TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS item_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT UNIQUE,
  category_id INTEGER,
  unit_id INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES item_categories(id) ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS stock_levels (
  warehouse_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  last_updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (warehouse_id, item_id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (item_id) REFERENCES items(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS stock_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  warehouse_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  delta INTEGER NOT NULL CHECK (delta <> 0),
  reason TEXT NOT NULL CHECK (reason IN ('stock_in', 'stock_out', 'adjustment', 'transfer_in', 'transfer_out')),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (item_id) REFERENCES items(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'edited', 'deleted', 'activated', 'deactivated', 'password_reset')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'warehouse', 'item', 'category', 'unit')),
  entity_id INTEGER,
  details_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_created_at ON stock_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_item ON stock_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_warehouse ON stock_transactions(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_user ON stock_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_user ON admin_audit_log(user_id);

CREATE TRIGGER IF NOT EXISTS trg_users_set_updated_at
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_warehouses_set_updated_at
AFTER UPDATE ON warehouses
FOR EACH ROW
BEGIN
  UPDATE warehouses SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_item_categories_set_updated_at
AFTER UPDATE ON item_categories
FOR EACH ROW
BEGIN
  UPDATE item_categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_units_set_updated_at
AFTER UPDATE ON units
FOR EACH ROW
BEGIN
  UPDATE units SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_items_set_updated_at
AFTER UPDATE ON items
FOR EACH ROW
BEGIN
  UPDATE items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_stock_transactions_prevent_negative
BEFORE INSERT ON stock_transactions
FOR EACH ROW
BEGIN
  SELECT
    CASE
      WHEN (
        COALESCE(
          (
            SELECT quantity
            FROM stock_levels
            WHERE warehouse_id = NEW.warehouse_id
              AND item_id = NEW.item_id
          ),
          0
        ) + NEW.delta
      ) < 0 THEN RAISE(ABORT, 'Insufficient stock for this transaction')
    END;
END;

CREATE TRIGGER IF NOT EXISTS trg_stock_transactions_apply_to_levels
AFTER INSERT ON stock_transactions
FOR EACH ROW
BEGIN
  INSERT INTO stock_levels (warehouse_id, item_id, quantity, last_updated_at)
  VALUES (NEW.warehouse_id, NEW.item_id, NEW.delta, CURRENT_TIMESTAMP)
  ON CONFLICT(warehouse_id, item_id)
  DO UPDATE SET
    quantity = stock_levels.quantity + NEW.delta,
    last_updated_at = CURRENT_TIMESTAMP;
END;

CREATE TRIGGER IF NOT EXISTS trg_stock_transactions_immutable_update
BEFORE UPDATE ON stock_transactions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'stock_transactions rows are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_stock_transactions_immutable_delete
BEFORE DELETE ON stock_transactions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'stock_transactions rows are immutable');
END;

INSERT OR IGNORE INTO item_categories (name) VALUES
  ('Tea'),
  ('Supplies'),
  ('Packaging'),
  ('Equipment');

INSERT OR IGNORE INTO units (name) VALUES
  ('box'),
  ('bag'),
  ('pack'),
  ('unit');
