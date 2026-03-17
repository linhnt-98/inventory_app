# Database Schema Notes

## Files
- `database_schema.sql`: full SQLite schema for users, warehouses, items, stock ledger, and admin audit.

## How stock works
- Write all stock changes to `stock_transactions` using signed `delta` values.
- Positive `delta` adds stock; negative `delta` removes stock.
- Triggers automatically keep `stock_levels` synchronized.
- Negative stock is blocked by trigger before insert.
- `stock_transactions` rows are immutable (no update/delete).

## Example writes
```sql
INSERT INTO stock_transactions (warehouse_id, item_id, user_id, delta, reason, note)
VALUES (1, 10, 2, 25, 'stock_in', 'Supplier delivery');

INSERT INTO stock_transactions (warehouse_id, item_id, user_id, delta, reason, note)
VALUES (1, 10, 2, -3, 'stock_out', 'Sent to downtown shop');
```

## Example reads
```sql
SELECT i.name, w.name AS warehouse, s.quantity
FROM stock_levels s
JOIN items i ON i.id = s.item_id
JOIN warehouses w ON w.id = s.warehouse_id
WHERE i.is_active = 1 AND w.is_active = 1
ORDER BY w.name, i.name;
```

```sql
SELECT t.id, t.created_at, w.name AS warehouse, i.name AS item, t.delta, t.reason, u.username, t.note
FROM stock_transactions t
JOIN warehouses w ON w.id = t.warehouse_id
JOIN items i ON i.id = t.item_id
JOIN users u ON u.id = t.user_id
ORDER BY t.created_at DESC
LIMIT 100;
```

## Integration guidance
- Store only `password_hash` in `users` (bcrypt/argon2 from backend).
- Treat `is_active = 0` as soft-delete for users/items/warehouses/categories/units.
- Do all stock operations by inserting into `stock_transactions`; do not write to `stock_levels` directly.
