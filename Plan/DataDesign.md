Warehouse
-id
-location
-name

Warehouse Item
-id
-name
-description
-sku

Warehouse Stock
-warehouse
-item
-count

User
-id
-username
-password
-email
-ismanager

Activity
-warehouse
-item
-count (positive for add, negative for removed)
-user
-datetime
-comment/note

ManageLog
-datetime
-user
-action (created, deleted, edited)
