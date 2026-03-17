notes on prototype:

If user forgets password, how would they recover their account?
How is the initial admin account setup?

Current prototype flow (frontend-only):
- On first run, the app checks if any `manager` exists.
- If no manager exists, user is forced to `/setup`.
- `/setup` creates exactly one initial manager account and auto-logs in.
- After setup, normal login flow is enabled and setup route is locked.
- Users are persisted in localStorage key: `inventory_users_v1`.


move create new item to top of items page
Activity History: add a search feature inside the user dropdown filter
Activity History: color code the activity according to what category it belongs to (stock, users, warehouses) and color those tabs respectively
