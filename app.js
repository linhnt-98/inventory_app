// ====================================================================
// APP STATE
// ====================================================================
const state = {
    loggedIn: false,
    currentUser: null,
    screenStack: ['screen-dashboard'],
    currentStockTab: 'add',
    deleteTarget: null,
    selectedItem: null,

    // Demo data
    items: [
        { id: 1, name: 'Large Cups',           sku: 'CUP-LG-001', category: 'cup',        desc: '16oz large cups for cold and hot beverages. BPA-free plastic.', meta: '{"size":"16oz","material":"plastic"}',
          stock: { 'main-storage': 150, 'downtown-shop': 45, 'uptown-shop': 22 }, threshold: 30 },
        { id: 2, name: 'Small Cups',            sku: 'CUP-SM-001', category: 'cup',        desc: '12oz small cups for espresso-based drinks.', meta: '',
          stock: { 'main-storage': 80, 'downtown-shop': 60, 'uptown-shop': 35 }, threshold: 30 },
        { id: 3, name: 'Boba Straws',           sku: 'STR-BB-001', category: 'straw',      desc: 'Extra-wide straws for boba/bubble tea.', meta: '{"diameter":"12mm"}',
          stock: { 'main-storage': 12, 'downtown-shop': 95, 'uptown-shop': 73 }, threshold: 50 },
        { id: 4, name: 'Regular Straws',        sku: 'STR-RG-001', category: 'straw',      desc: 'Standard straws for iced drinks.', meta: '',
          stock: { 'main-storage': 200, 'downtown-shop': 120, 'uptown-shop': 80 }, threshold: 50 },
        { id: 5, name: 'Cup Lids (Large)',       sku: 'LID-LG-001', category: 'lid',        desc: 'Dome lids for 16oz cups.', meta: '',
          stock: { 'main-storage': 200, 'downtown-shop': 55, 'uptown-shop': 35 }, threshold: 40 },
        { id: 6, name: 'Cup Lids (Small)',       sku: 'LID-SM-001', category: 'lid',        desc: 'Flat lids for 12oz cups.', meta: '',
          stock: { 'main-storage': 190, 'downtown-shop': 70, 'uptown-shop': 40 }, threshold: 40 },
        { id: 7, name: 'Jasmine Tea Leaves',    sku: 'ING-JT-001', category: 'ingredient', desc: 'Premium jasmine green tea leaves, loose leaf.', meta: '{"origin":"China","organic":true}',
          stock: { 'main-storage': 85, 'downtown-shop': 30, 'uptown-shop': 20 },  threshold: 25 },
        { id: 8, name: 'Tapioca Pearls',        sku: 'ING-TP-001', category: 'ingredient', desc: 'Black tapioca pearls for boba drinks.', meta: '',
          stock: { 'main-storage': 60, 'downtown-shop': 40, 'uptown-shop': 25 },  threshold: 20 },
        { id: 9, name: 'Hello Kitty Cup Charm', sku: 'MRC-HK-001', category: 'merch',      desc: 'Collectible Hello Kitty cup charm, limited edition.', meta: '{"series":"Sanrio Collab"}',
          stock: { 'main-storage': 28, 'downtown-shop': 15, 'uptown-shop': 10 },  threshold: 30 },
    ],

    warehouses: [
        { id: 'main-storage',   name: 'Main Storage',   address: '123 Warehouse Ave, Suite B',
          locations: [
              { name: 'Aisle A — Cups & Lids',      desc: 'Shelves 1–4' },
              { name: 'Aisle B — Straws & Utensils', desc: 'Shelves 1–3' },
              { name: 'Cold Room — Ingredients',     desc: 'Refrigerated section' },
          ]},
        { id: 'downtown-shop',  name: 'Downtown Shop',  address: '456 Main St',
          locations: [
              { name: 'Back Storage',      desc: 'Behind counter' },
              { name: 'Display Area',      desc: 'Front of shop' },
              { name: 'Cold Storage',      desc: 'Mini fridge area' },
          ]},
        { id: 'uptown-shop',    name: 'Uptown Shop',    address: '789 Uptown Blvd, Unit 2',
          locations: [
              { name: 'Storage Closet',    desc: 'Main storage area' },
              { name: 'Under Counter',     desc: 'Quick-access supplies' },
              { name: 'Break Room',        desc: 'Extra stock overflow' },
          ]},
    ],

    users: [
        { id: 1, name: 'Jason Lee',  email: 'admin@jasonsteashop.com', role: 'admin' },
        { id: 2, name: 'Sarah Kim',  email: 'sarah@jasonsteashop.com', role: 'stocker' },
        { id: 3, name: 'Mike Rivera', email: 'mike@jasonsteashop.com', role: 'stocker' },
        { id: 4, name: 'Lisa Chen',  email: 'lisa@jasonsteashop.com',  role: 'admin' },
    ],
};

// Category icons and colors
const catIcons = { cup: '🥤', straw: '🥤', lid: '🧢', ingredient: '🫖', merch: '🎁' };
const catColors = { cup: '#e9c89b', straw: '#fde49e', lid: '#d0e7ff', ingredient: '#b7e4c7', merch: '#f0d0e8' };

// ====================================================================
// AUTHENTICATION
// ====================================================================
function doLogin() {
    state.loggedIn = true;
    state.currentUser = { name: 'Jason', role: 'admin' };
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('bottom-nav').style.display = 'flex';
    document.getElementById('greeting-name').textContent = state.currentUser.name;
    renderItemsList();
    renderWarehousesList();
    renderUsersList();
}

function doLogout() {
    state.loggedIn = false;
    state.currentUser = null;
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('bottom-nav').style.display = 'none';
    // Reset to dashboard
    navigateTo('screen-dashboard', 'Dashboard');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector('.nav-item').classList.add('active');
}

// ====================================================================
// NAVIGATION
// ====================================================================
function navigateTo(screenId, title) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    document.getElementById('header-title').textContent = title || screenId;

    // Manage back button visibility
    const mainScreens = ['screen-dashboard', 'screen-stock', 'screen-items', 'screen-history', 'screen-more'];
    const header = document.getElementById('app-header');
    if (mainScreens.includes(screenId)) {
        header.classList.remove('with-back');
        state.screenStack = [screenId];
    } else {
        header.classList.add('with-back');
        state.screenStack.push(screenId);
    }

    // Scroll to top
    document.getElementById('app-body').scrollTop = 0;
}

function switchNav(screenId, title, btn) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    btn.classList.add('active');
    navigateTo(screenId, title);
}

function goBack() {
    state.screenStack.pop();
    const prev = state.screenStack[state.screenStack.length - 1] || 'screen-dashboard';
    const titles = {
        'screen-dashboard': 'Dashboard', 'screen-stock': 'Stock Management',
        'screen-items': 'Items', 'screen-history': 'Activity History',
        'screen-more': 'More', 'screen-warehouses': 'Warehouses',
        'screen-users': 'Users', 'screen-analytics': 'Analytics',
    };
    navigateTo(prev, titles[prev] || 'Back');
}

// ====================================================================
// STOCK MANAGEMENT
// ====================================================================
function switchStockTab(tab, btn) {
    state.currentStockTab = tab;
    document.querySelectorAll('#screen-stock .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    const actionBtn = document.getElementById('stock-action-btn');
    const moveDest = document.getElementById('move-destination');

    if (tab === 'add') {
        actionBtn.textContent = '➕ Add to Stock';
        actionBtn.className = 'btn btn-primary';
        moveDest.style.display = 'none';
    } else if (tab === 'remove') {
        actionBtn.textContent = '➖ Remove from Stock';
        actionBtn.className = 'btn btn-danger';
        moveDest.style.display = 'none';
    } else {
        actionBtn.textContent = '🔄 Move Stock';
        actionBtn.className = 'btn btn-warning';
        moveDest.style.display = 'block';
    }
}

// ====================================================================
// ITEM SEARCH (replaces barcode scanner)
// ====================================================================
function searchItems(query) {
    const dropdown = document.getElementById('stock-search-results');
    const q = query.trim().toLowerCase();

    if (!q) {
        dropdown.classList.remove('visible');
        return;
    }

    const matches = state.items.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );

    if (matches.length === 0) {
        dropdown.innerHTML = '<div class="search-no-results">No items found matching "' + query + '"</div>';
        dropdown.classList.add('visible');
        return;
    }

    dropdown.innerHTML = matches.map(item => `
        <div class="search-result-item" onclick="selectSearchItem(${item.id})">
            <div class="result-icon" style="background:${catColors[item.category]}">${catIcons[item.category]}</div>
            <div class="result-info">
                <div class="result-name">${item.name}</div>
                <div class="result-sku">${item.sku} · ${item.category.charAt(0).toUpperCase() + item.category.slice(1)}</div>
            </div>
        </div>
    `).join('');
    dropdown.classList.add('visible');
}

function selectSearchItem(itemId) {
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;

    state.selectedItem = item;

    // Update the selected item display
    document.getElementById('selected-item-name').textContent = item.name;
    document.getElementById('selected-item-sku').textContent = 'SKU: ' + item.sku;
    document.getElementById('selected-item-category').textContent = item.category.charAt(0).toUpperCase() + item.category.slice(1);
    document.getElementById('selected-item').style.display = 'block';
    document.getElementById('stock-qty').value = 1;

    // Clear search
    document.getElementById('stock-search-input').value = '';
    document.getElementById('stock-search-results').classList.remove('visible');

    showToast('✅ Selected: ' + item.name);
}

function clearSelectedItem() {
    state.selectedItem = null;
    document.getElementById('selected-item').style.display = 'none';
    document.getElementById('stock-search-input').value = '';
    document.getElementById('stock-search-results').classList.remove('visible');
}

function adjustQty(delta) {
    const input = document.getElementById('stock-qty');
    const val = Math.max(1, parseInt(input.value || 1) + delta);
    input.value = val;
}

function adjustThreshold(delta) {
    const input = document.getElementById('default-threshold');
    const val = Math.max(1, parseInt(input.value || 50) + delta);
    input.value = val;
}

function submitStockAction() {
    const wh = document.getElementById('stock-warehouse').value;
    const qty = document.getElementById('stock-qty').value;

    if (!state.selectedItem) { showToast('⚠️ Please search and select an item first'); return; }
    if (!wh) { showToast('⚠️ Please select a warehouse first'); return; }

    const itemName = state.selectedItem.name;
    const whName = state.warehouses.find(w => w.id === wh)?.name || wh;

    if (state.currentStockTab === 'add') {
        showToast(`✅ Added ${qty}× ${itemName} to ${whName}`);
    } else if (state.currentStockTab === 'remove') {
        showToast(`✅ Removed ${qty}× ${itemName} from ${whName}`);
    } else {
        const dest = document.getElementById('dest-warehouse').value;
        const destName = state.warehouses.find(w => w.id === dest)?.name || dest;
        showToast(`✅ Moved ${qty}× ${itemName}: ${whName} → ${destName}`);
    }

    clearSelectedItem();
}

// ====================================================================
// ITEMS
// ====================================================================
function renderItemsList(filter, category) {
    const list = document.getElementById('items-list');
    let items = state.items;
    if (filter) {
        const q = filter.toLowerCase();
        items = items.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
    }
    if (category && category !== 'all') {
        items = items.filter(i => i.category === category);
    }

    list.innerHTML = items.map(item => {
        const totalStock = Object.values(item.stock).reduce((a, b) => a + b, 0);
        const badgeClass = totalStock < item.threshold ? 'badge-danger' : totalStock < item.threshold * 2 ? 'badge-warning' : 'badge-success';
        return `
        <div class="list-item" onclick="viewItem(${item.id})">
            <div class="list-icon" style="background:${catColors[item.category]}">${catIcons[item.category]}</div>
            <div class="list-content">
                <div class="list-title">${item.name}</div>
                <div class="list-subtitle">${item.sku} · ${item.category.charAt(0).toUpperCase() + item.category.slice(1)}</div>
            </div>
            <span class="badge ${badgeClass}">${totalStock}</span>
        </div>`;
    }).join('');
}

function filterItems(q) { renderItemsList(q); }
function filterCategory(cat, btn) {
    document.querySelectorAll('#screen-items .tag').forEach(t => { t.style.background = ''; t.style.color = ''; });
    btn.style.background = 'var(--primary)';
    btn.style.color = 'white';
    renderItemsList(null, cat);
}

function viewItem(id) {
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    document.getElementById('detail-name').textContent = item.name;
    document.getElementById('detail-sku').textContent = 'SKU: ' + item.sku;
    document.getElementById('detail-category').textContent = item.category.charAt(0).toUpperCase() + item.category.slice(1);
    document.getElementById('detail-desc').textContent = item.desc;

    const stockHtml = state.warehouses.map(wh => {
        const qty = item.stock[wh.id] || 0;
        const cls = qty < item.threshold ? 'badge-danger' : qty < item.threshold * 2 ? 'badge-warning' : 'badge-success';
        return `<div class="flex-between" style="padding:8px 0;"><span class="text-sm">${wh.name}</span><span class="badge ${cls}">${qty}</span></div>`;
    }).join('');
    document.getElementById('detail-stock-list').innerHTML = stockHtml;

    state.currentItemId = id;
    navigateTo('screen-item-detail', item.name);
}

function saveItem() {
    const name = document.getElementById('item-name').value;
    if (!name) { showToast('⚠️ Item name is required'); return; }
    showToast('✅ Item saved: ' + name);
    closeModal('modal-item');
    document.getElementById('item-name').value = '';
    document.getElementById('item-sku').value = '';
    document.getElementById('item-desc').value = '';
    document.getElementById('item-meta').value = '';
}

// ====================================================================
// WAREHOUSES
// ====================================================================
function renderWarehousesList() {
    const list = document.getElementById('warehouses-list');
    list.innerHTML = state.warehouses.map(wh => {
        const totalStock = state.items.reduce((sum, item) => sum + (item.stock[wh.id] || 0), 0);
        const itemCount = state.items.filter(item => (item.stock[wh.id] || 0) > 0).length;
        return `
        <div class="list-item" onclick="viewWarehouse('${wh.id}')">
            <div class="list-icon" style="background:var(--success-light);">🏢</div>
            <div class="list-content">
                <div class="list-title">${wh.name}</div>
                <div class="list-subtitle">${wh.address}</div>
            </div>
            <div style="text-align:right;">
                <div class="text-sm fw-600">${totalStock}</div>
                <div class="text-xs text-muted">${itemCount} items</div>
            </div>
        </div>`;
    }).join('');
}

function viewWarehouse(id) {
    const wh = state.warehouses.find(w => w.id === id);
    if (!wh) return;
    document.getElementById('wh-detail-name').textContent = wh.name;
    document.getElementById('wh-detail-address').textContent = wh.address;

    const totalStock = state.items.reduce((sum, item) => sum + (item.stock[wh.id] || 0), 0);
    const itemCount = state.items.filter(item => (item.stock[wh.id] || 0) > 0).length;
    document.getElementById('wh-detail-items').textContent = itemCount;
    document.getElementById('wh-detail-stock').textContent = totalStock;

    const locsHtml = wh.locations.map((loc, i) => {
        const colors = ['var(--success-light)', 'var(--accent-light)', 'var(--warning-light)', '#d0e7ff', '#f0d0e8'];
        return `
        <div class="list-item">
            <div class="list-icon" style="background:${colors[i % colors.length]};">📍</div>
            <div class="list-content">
                <div class="list-title">${loc.name}</div>
                <div class="list-subtitle">${loc.desc}</div>
            </div>
            <span class="list-arrow">›</span>
        </div>`;
    }).join('');
    document.getElementById('wh-locations-list').innerHTML = locsHtml;

    state.currentWarehouseId = id;
    navigateTo('screen-warehouse-detail', wh.name);
}

function saveWarehouse() {
    const name = document.getElementById('wh-name').value;
    if (!name) { showToast('⚠️ Warehouse name is required'); return; }
    showToast('✅ Warehouse saved: ' + name);
    closeModal('modal-warehouse');
    document.getElementById('wh-name').value = '';
    document.getElementById('wh-address').value = '';
}

function saveLocation() {
    const name = document.getElementById('loc-name').value;
    if (!name) { showToast('⚠️ Location name is required'); return; }
    showToast('✅ Location saved: ' + name);
    closeModal('modal-location');
    document.getElementById('loc-name').value = '';
    document.getElementById('loc-desc').value = '';
}

// ====================================================================
// USERS
// ====================================================================
function renderUsersList() {
    const list = document.getElementById('users-list');
    list.innerHTML = state.users.map(user => `
        <div class="list-item">
            <div class="list-icon" style="background:${user.role === 'admin' ? 'var(--success-light)' : '#d0e7ff'};">
                ${user.role === 'admin' ? '👑' : '👤'}
            </div>
            <div class="list-content">
                <div class="list-title">${user.name}</div>
                <div class="list-subtitle">${user.email}</div>
            </div>
            <span class="badge ${user.role === 'admin' ? 'badge-success' : 'badge-info'}">
                ${user.role === 'admin' ? 'Admin' : 'Stocker'}
            </span>
        </div>
    `).join('');
}

function saveUser() {
    const name = document.getElementById('user-name').value;
    if (!name) { showToast('⚠️ User name is required'); return; }
    showToast('✅ User saved: ' + name);
    closeModal('modal-user');
    document.getElementById('user-name').value = '';
    document.getElementById('user-email').value = '';
    document.getElementById('user-password').value = '';
}

// ====================================================================
// HISTORY FILTERING
// ====================================================================
function switchHistoryTab(type, btn) {
    document.querySelectorAll('#screen-history .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.timeline-item').forEach(item => {
        if (type === 'all') {
            item.style.display = 'flex';
        } else {
            item.style.display = item.dataset.type === type ? 'flex' : 'none';
        }
    });
}

// ====================================================================
// ANALYTICS
// ====================================================================
function switchAnalyticsTab(tab, btn) {
    document.querySelectorAll('#screen-analytics .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('analytics-warehouse').style.display = tab === 'warehouse' ? 'block' : 'none';
    document.getElementById('analytics-stock').style.display = tab === 'stock' ? 'block' : 'none';
}

// ====================================================================
// MODALS
// ====================================================================
function openModal(id, isEdit) {
    document.getElementById(id).classList.add('active');
    if (id === 'modal-item') {
        document.getElementById('modal-item-title').textContent = isEdit ? 'Edit Item' : 'Create New Item';
    } else if (id === 'modal-warehouse') {
        document.getElementById('modal-warehouse-title').textContent = isEdit ? 'Edit Warehouse' : 'Add Warehouse';
    } else if (id === 'modal-user') {
        document.getElementById('modal-user-title').textContent = isEdit ? 'Edit User' : 'Add User';
    }
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// ====================================================================
// DELETE CONFIRMATION (with cascade option)
// ====================================================================
function confirmDelete(type) {
    state.deleteTarget = type;
    const msg = document.getElementById('delete-message');
    const cascade = document.getElementById('delete-cascade-option');

    if (type === 'item') {
        msg.textContent = 'Are you sure you want to delete this item? This will affect stock records across all warehouses.';
        cascade.style.display = 'block';
    } else if (type === 'warehouse') {
        msg.textContent = 'Are you sure you want to delete this warehouse? All stock and location data will be affected.';
        cascade.style.display = 'block';
    } else {
        msg.textContent = 'Are you sure you want to delete this? This action cannot be undone.';
        cascade.style.display = 'none';
    }
    openModal('modal-delete');
}

function executeDelete() {
    const cascade = document.getElementById('cascade-toggle').classList.contains('on');
    if (state.deleteTarget === 'item') {
        showToast(cascade ? '🗑️ Item and all stock records deleted' : '🗑️ Item deleted (stock preserved)');
    } else if (state.deleteTarget === 'warehouse') {
        showToast(cascade ? '🗑️ Warehouse and stock records deleted' : '🗑️ Warehouse deleted');
    }
    closeModal('modal-delete');
    goBack();
}

// ====================================================================
// TOAST NOTIFICATIONS
// ====================================================================
function showToast(message, duration = 2500) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => { toast.style.display = 'none'; }, duration);
}

// ====================================================================
// INIT
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {
    renderItemsList();
    renderWarehousesList();
    renderUsersList();

    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
    });

    // Close search dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const searchArea = document.querySelector('.item-search-area');
        if (searchArea && !searchArea.contains(e.target)) {
            document.getElementById('stock-search-results').classList.remove('visible');
        }
    });
});
