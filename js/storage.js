const SAVE_KEY = 'cqk_save';
const SESSION_KEY = 'cqk_session';
const SCHEMA = 2;

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return emptySave();
    const data = JSON.parse(raw);
    return migrate(data);
  } catch {
    return emptySave();
  }
}

export function writeSave(data) {
  data.schema = SCHEMA;
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeSession(session) {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

function emptySave() {
  return { schema: SCHEMA, profiles: {} };
}

function migrate(data) {
  if (!data || typeof data !== 'object') return emptySave();
  if (!data.profiles) data.profiles = {};
  data.schema = SCHEMA;
  return data;
}

export function normalizeName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function displayName(name) {
  return name.trim().replace(/\s+/g, ' ').slice(0, 20);
}
