import { CATALOGUE_CACHE_KEY, CATALOGUE_CACHE_TTL } from '../utils/catalogue-cache.util';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import { PokemonStore } from './pokemon.store';
import { PokemonApiService } from '../services/pokemon-api.service';
import { Pokemon } from '../models/pokemon.model';

const pikachu: Pokemon = {
  id: 25,
  name: 'pikachu',
  height: 4,
  weight: 60,
  types: ['electric'],
  sprite: '/assets/pokemon-fallback.svg',
  total: 6,
  stats: { hp: 1, attack: 1, defense: 1, 'special-attack': 1, 'special-defense': 1, speed: 1 },
};

describe('PokemonStore cache', () => {
  const api = { getPage$: vi.fn(), getByIds$: vi.fn(), getDetail$: vi.fn() };
  let store: PokemonStore;
  beforeEach(() => {
    sessionStorage.clear();
    vi.resetAllMocks();
    TestBed.configureTestingModule({ providers: [{ provide: PokemonApiService, useValue: api }] });
    store = TestBed.inject(PokemonStore);
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });
  it('restores a completed catalogue after reload without another network request', async () => {
    api.getPage$.mockReturnValue(of({ items: [pikachu], total: 1 }));
    await firstValueFrom(store.loadCatalogue$());
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PokemonApiService, useValue: api }] });
    const restored = TestBed.inject(PokemonStore);
    expect((await firstValueFrom(restored.catalogue$)).status).toBe('success');
    expect(await firstValueFrom(restored.loadCatalogue$())).toEqual([pikachu]);
    expect(api.getPage$).toHaveBeenCalledOnce();
  });
  it.each([
    '{',
    JSON.stringify({ savedAt: Date.now() - CATALOGUE_CACHE_TTL, total: 1, items: [pikachu] }),
    JSON.stringify({ savedAt: Date.now(), total: 2, items: [pikachu] }),
    JSON.stringify({ savedAt: Date.now(), total: 1, items: [{ ...pikachu, stats: {} }] }),
  ])('ignores corrupt, expired or incomplete session data', async (value) => {
    sessionStorage.setItem(CATALOGUE_CACHE_KEY, value);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PokemonApiService, useValue: api }] });
    const restored = TestBed.inject(PokemonStore);
    api.getPage$.mockReturnValue(of({ items: [pikachu], total: 1 }));
    expect(await firstValueFrom(restored.loadCatalogue$())).toEqual([pikachu]);
    expect(api.getPage$).toHaveBeenCalledOnce();
  });
  it('keeps successful browsing available when browser storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PokemonApiService, useValue: api }] });
    const restored = TestBed.inject(PokemonStore);
    api.getPage$.mockReturnValue(of({ items: [pikachu], total: 1 }));
    expect(await firstValueFrom(restored.loadCatalogue$())).toEqual([pikachu]);
    expect((await firstValueFrom(restored.catalogue$)).status).toBe('success');
  });
  it('shares an in-flight catalogue request and reuses a completed catalogue', async () => {
    const response = new Subject<{ items: readonly Pokemon[]; total: number }>();
    api.getPage$.mockReturnValue(response);
    const first = firstValueFrom(store.loadCatalogue$());
    const second = firstValueFrom(store.loadCatalogue$());
    expect(api.getPage$).toHaveBeenCalledOnce();
    response.next({ items: [pikachu], total: 1 });
    response.complete();
    expect(await first).toEqual([pikachu]);
    expect(await second).toEqual([pikachu]);
    expect(await firstValueFrom(store.loadCatalogue$())).toEqual([pikachu]);
    expect(api.getPage$).toHaveBeenCalledOnce();
  });

  it('does not cache failures and hydrates team IDs independently of browse loading', async () => {
    api.getPage$
      .mockReturnValueOnce(throwError(() => new Error('offline')))
      .mockReturnValueOnce(of({ items: [pikachu], total: 1 }));
    await firstValueFrom(store.loadCatalogue$()).catch(() => undefined);
    expect((await firstValueFrom(store.catalogue$)).status).toBe('error');
    expect(sessionStorage.getItem(CATALOGUE_CACHE_KEY)).toBeNull();
    api.getByIds$.mockReturnValue(of([pikachu]));
    expect(await firstValueFrom(store.ensurePokemon$([25]))).toEqual([pikachu]);
    expect(api.getByIds$).toHaveBeenCalledWith([25]);
    expect(await firstValueFrom(store.loadCatalogue$())).toEqual([pikachu]);
    expect((await firstValueFrom(store.catalogue$)).status).toBe('success');
  });

  it('rejects a truncated page and retries it without discarding complete pages', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      ...pikachu,
      id: index + 1,
      name: `pokemon-${index + 1}`,
    }));
    const last = { ...pikachu, id: 101, name: 'last-pokemon' };
    api.getPage$
      .mockReturnValueOnce(of({ items: firstPage, total: 101 }))
      .mockReturnValueOnce(of({ items: [], total: 101 }))
      .mockReturnValueOnce(of({ items: [last], total: 101 }));

    await expect(firstValueFrom(store.loadCatalogue$())).rejects.toThrow('incomplete');
    expect((await firstValueFrom(store.catalogue$)).status).toBe('error');
    expect((await firstValueFrom(store.catalogue$)).items).toEqual(firstPage);
    expect(sessionStorage.getItem(CATALOGUE_CACHE_KEY)).toBeNull();

    expect(await firstValueFrom(store.loadCatalogue$())).toEqual([...firstPage, last]);
    expect((await firstValueFrom(store.catalogue$)).status).toBe('success');
    expect(api.getPage$.mock.calls.map((call) => call[1])).toEqual([0, 100, 100]);
  });

  it('keeps successful pages and resumes only missing catalogue pages after failure', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      ...pikachu,
      id: index + 1,
      name: `pokemon-${index + 1}`,
    }));
    const next = { ...pikachu, id: 157, name: 'typhlosion' };
    api.getPage$.mockImplementation((_limit: number, offset: number) =>
      offset === 0 ? of({ items: firstPage, total: 101 }) : throwError(() => new Error('offline')),
    );
    await firstValueFrom(store.loadCatalogue$()).catch(() => undefined);
    api.getPage$.mockReturnValue(of({ items: [next], total: 101 }));
    expect(await firstValueFrom(store.loadCatalogue$())).toEqual([...firstPage, next]);
    expect(api.getPage$.mock.calls.map((call) => call[1])).toEqual([0, 100, 100]);
  });
});
