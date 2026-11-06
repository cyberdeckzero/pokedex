export const STAT_KEYS = [
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type PokemonStats = Readonly<Record<StatKey, number>>;

export interface Pokemon {
  readonly id: number;
  readonly name: string;
  readonly height: number;
  readonly weight: number;
  readonly types: readonly string[];
  readonly stats: PokemonStats;
  readonly total: number;
  readonly sprite: string;
}

export interface Ability {
  readonly name: string;
  readonly effect: string;
  readonly hidden: boolean;
}

export interface PokemonDetail {
  readonly pokemon: Pokemon;
  readonly abilities: readonly Ability[];
}
