import { Observable, combineLatest, distinctUntilChanged, map, shareReplay } from 'rxjs';
import { Pokemon, StatKey } from '../models/pokemon.model';
import { CatalogueState } from './pokemon.store';

export interface TableOptions {
  readonly type: string;
  readonly page: number;
  readonly pageSize: number;
  readonly sort: { readonly key: StatKey | 'total' | 'id'; readonly direction: 'asc' | 'desc' };
}
export interface PokemonTablePage {
  readonly items: readonly Pokemon[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly pageCount: number;
}
export const INITIAL_TABLE_OPTIONS: TableOptions = {
  type: '',
  page: 1,
  pageSize: 10,
  sort: { key: 'id', direction: 'asc' },
};

export function createPokemonSelectors(
  catalogue$: Observable<CatalogueState>,
  query$: Observable<string>,
  options$: Observable<TableOptions>,
) {
  const normalizedQuery$ = query$.pipe(
    map((query) => query.trim().toLowerCase()),
    distinctUntilChanged(),
  );
  const type$ = options$.pipe(
    map((options) => options.type),
    distinctUntilChanged(),
  );
  const filtered$ = combineLatest([
    catalogue$.pipe(
      map((state) => state.items),
      distinctUntilChanged(),
    ),
    normalizedQuery$,
    type$,
  ]).pipe(
    map(([pokemon, query, type]) =>
      pokemon.filter((item) => item.name.includes(query) && (!type || item.types.includes(type))),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  const sort$ = options$.pipe(
    map((options) => options.sort),
    distinctUntilChanged((a, b) => a.key === b.key && a.direction === b.direction),
  );
  const sorted$ = combineLatest([filtered$, sort$]).pipe(
    map(([pokemon, sort]) =>
      [...pokemon].sort((a, b) => {
        const value = (item: Pokemon) =>
          sort.key === 'id' ? item.id : sort.key === 'total' ? item.total : item.stats[sort.key];
        return (value(a) - value(b)) * (sort.direction === 'asc' ? 1 : -1) || a.id - b.id;
      }),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  const page$ = combineLatest([sorted$, options$]).pipe(
    map(([pokemon, options]): PokemonTablePage => {
      const pageCount = Math.max(1, Math.ceil(pokemon.length / options.pageSize));
      const page = Math.max(1, Math.min(options.page, pageCount));
      return {
        items: pokemon.slice((page - 1) * options.pageSize, page * options.pageSize),
        total: pokemon.length,
        page,
        pageCount,
        pageSize: options.pageSize,
      };
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  return { filtered$, sorted$, page$ };
}
