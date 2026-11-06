import { StatKey } from '../models/pokemon.model';

export const POKE_API_URL = 'https://beta.pokeapi.co/graphql/v1beta';
export const CATALOGUE_BATCH_SIZE = 100;
export const STAT_COLUMNS: readonly { key: StatKey | 'total'; label: string }[] = [
  { key: 'hp', label: 'HP' },
  { key: 'attack', label: 'Attack' },
  { key: 'defense', label: 'Defense' },
  { key: 'special-attack', label: 'Sp. Atk' },
  { key: 'special-defense', label: 'Sp. Def' },
  { key: 'speed', label: 'Speed' },
  { key: 'total', label: 'Total' },
];
export const POKEMON_TYPES = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
  'stellar',
  'unknown',
];
export const SPRITE_FALLBACK = '/assets/pokemon-fallback.svg';
