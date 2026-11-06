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
  pokemontypes: { type: { name: string } }[];
  pokemonstats: { base_stat: number; stat: { name: string } }[];
  pokemonsprites: { sprites: unknown }[];
}
interface PokemonRows {
  pokemon: ApiPokemon[];
}
interface PageResponse extends PokemonRows {
  pokemon_aggregate: { aggregate: { count: number } };
}
interface DetailResponse extends PokemonRows {
  pokemonability: {
    is_hidden: boolean;
    ability: {
      name: string;
      abilityeffecttexts: { short_effect: string }[];
    };
  }[];
}
export interface PokemonPage {
  readonly items: readonly Pokemon[];
  readonly total: number;
}

const POKEMON_FIELDS = `
  id name height weight
  pokemontypes(order_by: {slot: asc}) { type { name } }
  pokemonstats { base_stat stat { name } }
  pokemonsprites { sprites(path: "front_default") }
`;
const GET_POKEMON = `query GetPokemon($limit: Int!, $offset: Int!) {
  pokemon(limit: $limit, offset: $offset, order_by: {id: asc}) { ${POKEMON_FIELDS} }
  pokemon_aggregate { aggregate { count } }
}`;
const GET_BY_IDS = `query GetPokemonByIds($ids: [Int!]!) {
  pokemon(where: {id: {_in: $ids}}, order_by: {id: asc}) { ${POKEMON_FIELDS} }
}`;
const GET_DETAIL = `query GetPokemonDetail($id: Int!) {
  pokemon(where: {id: {_eq: $id}}) { ${POKEMON_FIELDS} }
  pokemonability(where: {pokemon_id: {_eq: $id}}, order_by: {slot: asc}) {
    is_hidden
    ability {
      name
      abilityeffecttexts(where: {language_id: {_eq: 9}}) { short_effect }
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
        items: data.pokemon.map(mapPokemon),
        total: data.pokemon_aggregate.aggregate.count,
      })),
    );
  }

  /** Fetches team members independently of catalogue pagination. */
  getByIds$(ids: readonly number[]): Observable<readonly Pokemon[]> {
    return this.query$<PokemonRows>('GetPokemonByIds', GET_BY_IDS, { ids }).pipe(
      map((data) => data.pokemon.map(mapPokemon)),
    );
  }

  /** Fetches current Pokémon information and English ability descriptions by ID. */
  getDetail$(id: number): Observable<PokemonDetail | null> {
    return this.query$<DetailResponse>('GetPokemonDetail', GET_DETAIL, { id }).pipe(
      map((data) => {
        const pokemon = data.pokemon[0];
        if (!pokemon) return null;
        return {
          pokemon: mapPokemon(pokemon),
          abilities: data.pokemonability.map((item) => ({
            name: item.ability.name,
            hidden: item.is_hidden,
            effect:
              item.ability.abilityeffecttexts[0]?.short_effect ??
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
    const value = row.pokemonstats.find((item) => item.stat.name === key)?.base_stat;
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
    types: row.pokemontypes.map((item) => item.type.name),
    stats,
    total: Object.values(stats).reduce((total, value) => total + value, 0),
    sprite: spriteUrl(row.pokemonsprites[0]?.sprites),
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
