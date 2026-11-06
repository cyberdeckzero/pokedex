import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  defer,
  distinctUntilChanged,
  finalize,
  from,
  map,
  mergeMap,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
  toArray,
} from 'rxjs';
import { RequestStatus } from '../../common/models/request-state.model';
import { CATALOGUE_BATCH_SIZE } from '../constants/pokemon.constants';
import { Pokemon, PokemonDetail } from '../models/pokemon.model';
import { PokemonApiService } from '../services/pokemon-api.service';

export interface CatalogueState {
  readonly items: readonly Pokemon[];
  readonly status: RequestStatus;
  readonly error: string | null;
  readonly total: number;
}

@Injectable({ providedIn: 'root' })
export class PokemonStore {
  private readonly api = inject(PokemonApiService);
  private readonly stateSubject = new BehaviorSubject<CatalogueState>({
    items: [],
    status: 'idle',
    error: null,
    total: 0,
  });
  private readonly loadedOffsets = new Set<number>();
  private catalogueRequest?: Observable<readonly Pokemon[]>;
  private readonly memberRequests = new Map<string, Observable<readonly Pokemon[]>>();
  private readonly detailRequests = new Map<number, Observable<PokemonDetail | null>>();
  private readonly details = new Map<number, PokemonDetail>();

  readonly catalogue$ = this.stateSubject.asObservable();
  readonly pokemon$ = this.catalogue$.pipe(
    map((state) => state.items),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  /** Loads the full catalogue in pages, sharing requests and resuming only missing pages after failure. */
  loadCatalogue$(): Observable<readonly Pokemon[]> {
    return defer(() => {
      if (this.stateSubject.value.status === 'success') return of(this.stateSubject.value.items);
      if (this.catalogueRequest) return this.catalogueRequest;
      this.catalogueRequest = defer(() => {
        this.patch({ status: 'loading', error: null });
        const firstPage$ = this.loadedOffsets.has(0)
          ? of(this.stateSubject.value.total)
          : this.loadPage$(0);
        return firstPage$.pipe(
          switchMap((total) => {
            const offsets = Array.from(
              { length: Math.ceil(total / CATALOGUE_BATCH_SIZE) },
              (_, i) => i * CATALOGUE_BATCH_SIZE,
            ).filter((offset) => !this.loadedOffsets.has(offset));
            return from(offsets).pipe(
              mergeMap((offset) => this.loadPage$(offset), 2),
              toArray(),
            );
          }),
          map(() => {
            this.patch({ status: 'success', error: null });
            return this.stateSubject.value.items;
          }),
          catchError((error: unknown) => {
            this.patch({
              status: 'error',
              error: 'The Pokédex could not load. Check your connection and try again.',
            });
            return throwError(() => error);
          }),
          finalize(() => {
            this.catalogueRequest = undefined;
            if (this.stateSubject.value.status === 'loading') this.patch({ status: 'idle' });
          }),
        );
      }).pipe(shareReplay({ bufferSize: 1, refCount: true }));
      return this.catalogueRequest;
    });
  }

  /** Returns cached members or fetches missing IDs without waiting for the browse catalogue. */
  ensurePokemon$(ids: readonly number[]): Observable<readonly Pokemon[]> {
    return defer(() => {
      const cached = new Map(this.stateSubject.value.items.map((pokemon) => [pokemon.id, pokemon]));
      const missing = [...new Set(ids)].filter((id) => !cached.has(id)).sort((a, b) => a - b);
      const members = () =>
        ids.flatMap((id) => {
          const member = this.stateSubject.value.items.find((pokemon) => pokemon.id === id);
          return member ? [member] : [];
        });
      if (!missing.length) return of(members());
      const key = missing.join(',');
      let request = this.memberRequests.get(key);
      if (!request) {
        request = this.api.getByIds$(missing).pipe(
          tap((pokemon) => {
            if (missing.some((id) => !pokemon.some((member) => member.id === id)))
              throw new Error('Some team members were not found.');
            this.cache(pokemon);
          }),
          finalize(() => this.memberRequests.delete(key)),
          shareReplay({ bufferSize: 1, refCount: true }),
        );
        this.memberRequests.set(key, request);
      }
      return request.pipe(map(members));
    });
  }

  /** Reuses successful details, deduplicates in-flight requests, and never caches failures. */
  getDetail$(id: number): Observable<PokemonDetail | null> {
    return defer(() => {
      const cached = this.details.get(id);
      if (cached) return of(cached);
      let request = this.detailRequests.get(id);
      if (!request) {
        request = this.api.getDetail$(id).pipe(
          tap((detail) => {
            if (detail) {
              this.details.set(id, detail);
              this.cache([detail.pokemon]);
            }
          }),
          finalize(() => this.detailRequests.delete(id)),
          shareReplay({ bufferSize: 1, refCount: true }),
        );
        this.detailRequests.set(id, request);
      }
      return request;
    });
  }

  private loadPage$(offset: number): Observable<number> {
    return this.api.getPage$(CATALOGUE_BATCH_SIZE, offset).pipe(
      tap((page) => {
        this.cache(page.items);
        this.loadedOffsets.add(offset);
        this.patch({ total: page.total });
      }),
      map((page) => page.total),
    );
  }

  private cache(pokemon: readonly Pokemon[]): void {
    const next = new Map(this.stateSubject.value.items.map((item) => [item.id, item]));
    pokemon.forEach((item) => next.set(item.id, item));
    this.patch({ items: [...next.values()].sort((a, b) => a.id - b.id) });
  }

  private patch(state: Partial<CatalogueState>): void {
    this.stateSubject.next({ ...this.stateSubject.value, ...state });
  }
}
