import { Pokemon, STAT_KEYS } from '../models/pokemon.model';

export const CATALOGUE_CACHE_KEY = 'mini-pokedex:catalogue:v1beta2:v1';
export const CATALOGUE_CACHE_TTL = 60 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isPokemon(value: unknown): value is Pokemon {
  if (!isRecord(value) || !isRecord(value['stats'])) return false;
  const stats = value['stats'];
  return (
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    typeof value['name'] === 'string' &&
    value['name'].length > 0 &&
    typeof value['height'] === 'number' &&
    Number.isFinite(value['height']) &&
    typeof value['weight'] === 'number' &&
    Number.isFinite(value['weight']) &&
    typeof value['sprite'] === 'string' &&
    (value['sprite'].startsWith('https://') ||
      value['sprite'] === '/assets/pokemon-fallback.svg') &&
    Array.isArray(value['types']) &&
    value['types'].length > 0 &&
    value['types'].every((type: unknown) => typeof type === 'string') &&
    STAT_KEYS.every(
      (key) =>
        typeof stats[key] === 'number' &&
        Number.isInteger(stats[key]) &&
        stats[key] >= 0 &&
        stats[key] <= 255,
    ) &&
    value['total'] === STAT_KEYS.reduce((total, key) => total + Number(stats[key]), 0)
  );
}

/** Restores only a fresh, complete, validated catalogue from this browser tab. */
export function readCatalogueCache(): readonly Pokemon[] | null {
  try {
    const raw = sessionStorage.getItem(CATALOGUE_CACHE_KEY);
    if (!raw || raw.length > 4_000_000) return null;
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      typeof value['savedAt'] !== 'number' ||
      value['savedAt'] > Date.now() ||
      Date.now() - value['savedAt'] >= CATALOGUE_CACHE_TTL ||
      !Array.isArray(value['items'])
    )
      return null;
    const items: unknown[] = value['items'];
    if (
      !items.length ||
      value['total'] !== items.length ||
      !items.every(isPokemon) ||
      new Set(items.map((item) => item.id)).size !== items.length
    )
      return null;
    return items;
  } catch {
    return null;
  }
}

/** Saves a completed catalogue; unavailable or full storage must not break browsing. */
export function writeCatalogueCache(items: readonly Pokemon[], total: number): void {
  if (!items.length || items.length !== total) return;
  try {
    sessionStorage.setItem(
      CATALOGUE_CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), total, items }),
    );
  } catch {
    // Memory caching remains available when browser storage is disabled or full.
  }
}
