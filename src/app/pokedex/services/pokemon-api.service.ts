import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, retry, timeout } from 'rxjs';
import { GraphqlResponse } from '../../common/models/request-state.model';
import { requireGraphqlData } from '../../common/utils/graphql.util';
import { POKE_API_URL, SPRITE_FALLBACK } from '../constants/pokemon.constants';
import { Pokemon, PokemonDetail, StatKey } from '../models/pokemon.model';

interface ApiPokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  pokemon_v2_pokemontypes: { pokemon_v2_type: { name: string } }[];
  pokemon_v2_pokemonstats: { base_stat: number; pokemon_v2_stat: { name: string } }[];
  pokemon_v2_pokemonsprites: { sprites: unknown }[];
}
interface PokemonRows {
  pokemon_v2_pokemon: ApiPokemon[];
}
interface PageResponse extends PokemonRows {
  pokemon_v2_pokemon_aggregate: { aggregate: { count: number } };
}
interface DetailResponse extends PokemonRows {
  pokemon_v2_pokemonability: {
    is_hidden: boolean;
    pokemon_v2_ability: {
      name: string;
      pokemon_v2_abilityeffecttexts: { short_effect: string }[];
    };
  }[];
}
export interface PokemonPage {
  readonly items: readonly Pokemon[];
  readonly total: number;
}

const POKEMON_FIELDS = `
  id name height weight
  pokemon_v2_pokemontypes(order_by: {slot: asc}) { pokemon_v2_type { name } }
  pokemon_v2_pokemonstats { base_stat pokemon_v2_stat { name } }
  pokemon_v2_pokemonsprites { sprites(path: "front_default") }
`;
const GET_POKEMON = `query GetPokemon($limit: Int!, $offset: Int!) {
  pokemon_v2_pokemon(limit: $limit, offset: $offset, order_by: {id: asc}) { ${POKEMON_FIELDS} }
  pokemon_v2_pokemon_aggregate { aggregate { count } }
}`;
const GET_BY_IDS = `query GetPokemonByIds($ids: [Int!]!) {
  pokemon_v2_pokemon(where: {id: {_in: $ids}}, order_by: {id: asc}) { ${POKEMON_FIELDS} }
}`;
const GET_DETAIL = `query GetPokemonDetail($id: Int!) {
  pokemon_v2_pokemon(where: {id: {_eq: $id}}) { ${POKEMON_FIELDS} }
  pokemon_v2_pokemonability(where: {pokemon_id: {_eq: $id}}, order_by: {slot: asc}) {
    is_hidden
    pokemon_v2_ability {
      name
      pokemon_v2_abilityeffecttexts(where: {language_id: {_eq: 9}}) { short_effect }
    }
  }
}`;

@Injectable({ providedIn: 'root' })
export class PokemonApiService {
  private readonly http = inject(HttpClient);

  /** Fetches one ordered catalogue page and the server's total record count. */
  getPage$(limit: number, offset: number): Observable<PokemonPage> {
    return this.query$<PageResponse>('GetPokemon', GET_POKEMON, { limit, offset }).pipe(
      map((data) => ({
        items: data.pokemon_v2_pokemon.map(mapPokemon),
        total: data.pokemon_v2_pokemon_aggregate.aggregate.count,
      })),
    );
  }

  /** Fetches team members independently of catalogue pagination. */
  getByIds$(ids: readonly number[]): Observable<readonly Pokemon[]> {
    return this.query$<PokemonRows>('GetPokemonByIds', GET_BY_IDS, { ids }).pipe(
      map((data) => data.pokemon_v2_pokemon.map(mapPokemon)),
    );
  }

  /** Fetches current Pokémon information and English ability descriptions by ID. */
  getDetail$(id: number): Observable<PokemonDetail | null> {
    return this.query$<DetailResponse>('GetPokemonDetail', GET_DETAIL, { id }).pipe(
      map((data) => {
        const pokemon = data.pokemon_v2_pokemon[0];
        if (!pokemon) return null;
        return {
          pokemon: mapPokemon(pokemon),
          abilities: data.pokemon_v2_pokemonability.map((item) => ({
            name: item.pokemon_v2_ability.name,
            hidden: item.is_hidden,
            effect:
              item.pokemon_v2_ability.pokemon_v2_abilityeffecttexts[0]?.short_effect ??
              'No English description is available.',
          })),
        };
      }),
    );
  }

  private query$<T>(operationName: string, query: string, variables: object): Observable<T> {
    return this.http
      .post<GraphqlResponse<T>>(POKE_API_URL, { operationName, query, variables })
      .pipe(timeout(12_000), map(requireGraphqlData), retry({ count: 2, delay: 500 }));
  }
}

function mapPokemon(row: ApiPokemon): Pokemon {
  const stat = (key: StatKey): number => {
    const value = row.pokemon_v2_pokemonstats.find(
      (item) => item.pokemon_v2_stat.name === key,
    )?.base_stat;
    if (value === undefined) throw new Error('Pokémon stats are incomplete.');
    return value;
  };
  const stats = {
    hp: stat('hp'),
    attack: stat('attack'),
    defense: stat('defense'),
    'special-attack': stat('special-attack'),
    'special-defense': stat('special-defense'),
    speed: stat('speed'),
  };
  return {
    id: row.id,
    name: row.name,
    height: row.height,
    weight: row.weight,
    types: row.pokemon_v2_pokemontypes.map((item) => item.pokemon_v2_type.name),
    stats,
    total: Object.values(stats).reduce((total, value) => total + value, 0),
    sprite: spriteUrl(row.pokemon_v2_pokemonsprites[0]?.sprites),
  };
}

function spriteUrl(value: unknown): string {
  if (typeof value === 'string') {
    if (value.startsWith('https://')) return value;
    // Older API responses sometimes encode the sprite object as a JSON string.
    try {
      const parsed: unknown = JSON.parse(value);
      return spriteUrl(parsed);
    } catch {
      return SPRITE_FALLBACK;
    }
  }
  if (typeof value === 'object' && value !== null && 'front_default' in value)
    return spriteUrl(value.front_default);
  return SPRITE_FALLBACK;
}
