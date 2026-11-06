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
  sprite: '',
  total: 6,
  stats: { hp: 1, attack: 1, defense: 1, 'special-attack': 1, 'special-defense': 1, speed: 1 },
};

describe('PokemonStore cache', () => {
  const api = { getPage$: vi.fn(), getByIds$: vi.fn(), getDetail$: vi.fn() };
  let store: PokemonStore;
  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({ providers: [{ provide: PokemonApiService, useValue: api }] });
    store = TestBed.inject(PokemonStore);
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
    api.getByIds$.mockReturnValue(of([pikachu]));
    expect(await firstValueFrom(store.ensurePokemon$([25]))).toEqual([pikachu]);
    expect(api.getByIds$).toHaveBeenCalledWith([25]);
    expect(await firstValueFrom(store.loadCatalogue$())).toEqual([pikachu]);
    expect((await firstValueFrom(store.catalogue$)).status).toBe('success');
  });

  it('keeps successful pages and resumes only missing catalogue pages after failure', async () => {
    const next = { ...pikachu, id: 157, name: 'typhlosion' };
    api.getPage$.mockImplementation((_limit: number, offset: number) =>
      offset === 0 ? of({ items: [pikachu], total: 101 }) : throwError(() => new Error('offline')),
    );
    await firstValueFrom(store.loadCatalogue$()).catch(() => undefined);
    api.getPage$.mockReturnValue(of({ items: [next], total: 101 }));
    expect(await firstValueFrom(store.loadCatalogue$())).toEqual([pikachu, next]);
    expect(api.getPage$.mock.calls.map((call) => call[1])).toEqual([0, 100, 100]);
  });
});
