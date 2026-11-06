import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { PokemonApiService } from './pokemon-api.service';
import { POKE_API_URL, SPRITE_FALLBACK } from '../constants/pokemon.constants';

const apiPokemon = {
  id: 25,
  name: 'pikachu',
  height: 4,
  weight: 60,
  pokemon_v2_pokemontypes: [{ pokemon_v2_type: { name: 'electric' } }],
  pokemon_v2_pokemonstats: [
    'hp',
    'attack',
    'defense',
    'special-attack',
    'special-defense',
    'speed',
  ].map((name, i) => ({ base_stat: 30 + i, pokemon_v2_stat: { name } })),
  pokemon_v2_pokemonsprites: [{ sprites: null }],
};
const page = {
  data: {
    pokemon_v2_pokemon: [apiPokemon],
    pokemon_v2_pokemon_aggregate: { aggregate: { count: 1 } },
  },
};

describe('PokemonApiService', () => {
  let api: PokemonApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(PokemonApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('retries HTTP-200 GraphQL errors and maps a recovered response with a stable sprite fallback', async () => {
    vi.useFakeTimers();
    const result = firstValueFrom(api.getPage$(100, 0));
    const first = http.expectOne(POKE_API_URL);
    expect(first.request.body.operationName).toBe('GetPokemon');
    expect(first.request.body.variables).toEqual({ limit: 100, offset: 0 });
    first.flush({ errors: [{ message: 'temporary failure' }] });
    await vi.advanceTimersByTimeAsync(500);
    http.expectOne(POKE_API_URL).flush(page);
    expect(await result).toMatchObject({
      total: 1,
      items: [{ id: 25, total: 195, sprite: SPRITE_FALLBACK }],
    });
  });

  it('surfaces an error after two bounded retries and permits a fresh request', async () => {
    vi.useFakeTimers();
    const failure = firstValueFrom(api.getPage$(100, 0)).catch((error: unknown) => error);
    for (let attempt = 0; attempt < 3; attempt++) {
      http.expectOne(POKE_API_URL).flush('offline', { status: 503, statusText: 'Unavailable' });
      if (attempt < 2) await vi.advanceTimersByTimeAsync(500);
    }
    expect(await failure).toBeInstanceOf(HttpErrorResponse);
    const recovery = firstValueFrom(api.getPage$(100, 0));
    http.expectOne(POKE_API_URL).flush(page);
    expect((await recovery).items[0].name).toBe('pikachu');
  });
});
