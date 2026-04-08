import Papa from 'papaparse';
import JSZip from 'jszip';

const CSV_FILE_TO_ENTITY = {
  'users.csv': 'users',
  'warehouses.csv': 'warehouses',
  'categories.csv': 'categories',
  'units.csv': 'units',
  'items.csv': 'items',
  'stock_levels.csv': 'stock_levels',
  'stock_transactions.csv': 'stock_transactions',
};

const ENTITY_TO_CSV_FILE = {
  users: 'users.csv',
  warehouses: 'warehouses.csv',
  categories: 'categories.csv',
  units: 'units.csv',
  items: 'items.csv',
  stock_levels: 'stock_levels.csv',
  stock_transactions: 'stock_transactions.csv',
};

function toBoolean(value, fallback = true) {
  if (typeof value === 'boolean') return value;
  const text = String(value ?? '').trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(text)) return true;
  if (['false', '0', 'no', 'n'].includes(text)) return false;
  return fallback;
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toInteger(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.trunc(num) : fallback;
}

function normalizeRows(entity, rows) {
  switch (entity) {
    case 'users':
      return rows.map((row) => ({
        username: row.username || '',
        display_name: row.display_name || row.displayName || row.username || '',
        role: row.role === 'manager' ? 'manager' : 'employee',
        is_active: toBoolean(row.is_active ?? row.isActive, true),
        created_at: row.created_at || null,
        updated_at: row.updated_at || null,
      }));
    case 'warehouses':
      return rows.map((row) => ({
        name: row.name || '',
        address: row.address || '',
        lat: toNullableNumber(row.lat),
        lng: toNullableNumber(row.lng),
        is_active: toBoolean(row.is_active, true),
      }));
    case 'categories':
      return rows.map((row) => ({
        name: row.name || '',
        is_active: toBoolean(row.is_active, true),
      }));
    case 'units':
      return rows.map((row) => ({
        name: row.name || '',
        is_active: toBoolean(row.is_active, true),
      }));
    case 'items':
      return rows.map((row) => ({
        name: row.name || '',
        description: row.description || null,
        sku: row.sku || null,
        category_name: row.category_name || null,
        unit_name: row.unit_name || null,
        attributes_json: row.attributes_json ? safeParseJson(row.attributes_json) : null,
        is_active: toBoolean(row.is_active, true),
      }));
    case 'stock_levels':
      return rows.map((row) => ({
        warehouse_name: row.warehouse_name || '',
        item_sku: row.item_sku || null,
        item_name: row.item_name || '',
        quantity: Math.max(0, toInteger(row.quantity, 0)),
        last_updated_at: row.last_updated_at || null,
      }));
    case 'stock_transactions':
      return rows.map((row) => ({
        warehouse_name: row.warehouse_name || '',
        item_sku: row.item_sku || null,
        item_name: row.item_name || '',
        username: row.username || '',
        delta: toInteger(row.delta, 0),
        reason: row.reason || 'adjustment',
        note: row.note || '',
        created_at: row.created_at || null,
      }));
    default:
      return rows;
  }
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseCsvText(text) {
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors?.length) {
    throw new Error(parsed.errors[0]?.message || 'Unable to parse CSV');
  }

  return parsed.data || [];
}

export function snapshotToCsvPack(snapshot) {
  const meta = snapshot?.meta || {};
  const data = snapshot?.data || {};
  const files = [];

  files.push({
    name: 'meta.json',
    content: JSON.stringify(meta, null, 2),
    mimeType: 'application/json',
  });

  for (const [entity, filename] of Object.entries(ENTITY_TO_CSV_FILE)) {
    const rows = Array.isArray(data[entity]) ? data[entity] : [];
    const csv = Papa.unparse(rows);
    files.push({
      name: filename,
      content: csv,
      mimeType: 'text/csv;charset=utf-8;',
    });
  }

  return files;
}

export async function snapshotToCsvZipBlob(snapshot) {
  const files = snapshotToCsvPack(snapshot);
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.name, file.content);
  }

  return zip.generateAsync({ type: 'blob' });
}

export async function csvZipFileToSnapshot(zipFile) {
  const zip = await JSZip.loadAsync(zipFile);
  const files = [];

  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  for (const entry of entries) {
    const content = await entry.async('string');
    const name = entry.name.split('/').pop();
    if (!name) continue;

    files.push(new File([content], name, {
      type: name.endsWith('.json') ? 'application/json' : 'text/csv',
    }));
  }

  return csvPackFilesToSnapshot(files);
}

export async function csvPackFilesToSnapshot(files) {
  if (!files?.length) {
    throw new Error('No files selected for CSV import');
  }

  const fileMap = new Map();
  for (const file of files) {
    fileMap.set(file.name.toLowerCase(), file);
  }

  let meta = null;
  const metaFile = fileMap.get('meta.json');
  if (metaFile) {
    const metaText = await metaFile.text();
    meta = safeParseJson(metaText);
  }

  const data = {
    users: [],
    warehouses: [],
    categories: [],
    units: [],
    items: [],
    stock_levels: [],
    stock_transactions: [],
  };

  for (const [filename, entity] of Object.entries(CSV_FILE_TO_ENTITY)) {
    const file = fileMap.get(filename);
    if (!file) continue;
    const text = await file.text();
    const rows = parseCsvText(text);
    data[entity] = normalizeRows(entity, rows);
  }

  const countEntries = Object.fromEntries(
    Object.entries(data).map(([entity, rows]) => [entity, rows.length])
  );

  return {
    meta: {
      export_version: meta?.export_version || '1.0',
      app_schema_version: meta?.app_schema_version || 'csv-pack-import',
      exported_at: meta?.exported_at || new Date().toISOString(),
      exported_by: meta?.exported_by || {
        user_id: null,
        username: 'unknown',
        display_name: 'Unknown',
      },
      provider: meta?.provider || 'csv-pack',
      options: {
        include_transactions: countEntries.stock_transactions > 0,
        include_users: countEntries.users > 0,
        include_user_credentials: false,
      },
      entity_counts: countEntries,
      checksum: null,
    },
    data,
  };
}

export function isLikelyCsvPack(files) {
  if (!files?.length) return false;
  const names = new Set(Array.from(files).map((file) => file.name.toLowerCase()));
  return Object.keys(CSV_FILE_TO_ENTITY).some((filename) => names.has(filename));
}
