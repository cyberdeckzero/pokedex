import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { createPokemonSelectors, INITIAL_TABLE_OPTIONS } from './pokemon.selectors';
import { Pokemon } from '../models/pokemon.model';
import { CatalogueState } from './pokemon.store';

function pokemon(id: number, name: string, attack: number, types: string[]): Pokemon {
  return {
    id,
    name,
    types,
    height: 1,
    weight: 1,
    sprite: '',
    total: attack + 5,
    stats: { hp: 1, attack, defense: 1, 'special-attack': 1, 'special-defense': 1, speed: 1 },
  };
}

describe('Pokémon selectors', () => {
  it('filters and sorts the entire collection before paging without mutating it', async () => {
    const source = Object.freeze([
      pokemon(1, 'bulbasaur', 49, ['grass']),
      pokemon(6, 'charizard', 84, ['fire']),
      pokemon(25, 'pikachu', 55, ['electric']),
      pokemon(157, 'typhlosion', 84, ['fire']),
    ]);
    const state = of<CatalogueState>({ items: source, status: 'success', error: null, total: 4 });
    const options = new BehaviorSubject({
      ...INITIAL_TABLE_OPTIONS,
      type: 'fire',
      pageSize: 1,
      page: 2,
      sort: { key: 'attack' as const, direction: 'desc' as const },
    });
    const selectors = createPokemonSelectors(state, of(''), options);
    const page = await firstValueFrom(selectors.page$);
    expect(page.total).toBe(2);
    expect(page.pageCount).toBe(2);
    expect(page.items.map((p) => p.id)).toEqual([157]);
    expect(source.map((p) => p.id)).toEqual([1, 6, 25, 157]);
  });

  it('normalizes search and clamps an out-of-range page after filtering', async () => {
    const state = of<CatalogueState>({
      items: [pokemon(25, 'pikachu', 55, ['electric'])],
      status: 'success',
      error: null,
      total: 1,
    });
    const selectors = createPokemonSelectors(
      state,
      of('  PIKA  '),
      of({ ...INITIAL_TABLE_OPTIONS, page: 99 }),
    );
    expect(await firstValueFrom(selectors.page$)).toMatchObject({
      total: 1,
      page: 1,
      pageCount: 1,
    });
  });
});
