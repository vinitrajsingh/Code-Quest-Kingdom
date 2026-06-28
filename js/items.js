let catalog = [];

export async function loadItems() {
  if (catalog.length) return catalog;
  const res = await fetch('data/items.json');
  catalog = await res.json();
  return catalog;
}

export function getAllItems() {
  return catalog;
}

export function getItem(id) {
  return catalog.find(item => item.id === id) || null;
}

export function preloadItems() {
  return loadItems();
}
