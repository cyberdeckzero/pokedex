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
  pokemontypes: [{ type: { name: 'electric' } }],
  pokemonstats: ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'].map(
    (name, i) => ({ base_stat: 30 + i, stat: { name } }),
  ),
  pokemonsprites: [{ sprites: null }],
};
const page = {
  data: {
    pokemon: [apiPokemon],
    pokemon_aggregate: { aggregate: { count: 1 } },
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

  it('uses the public v1beta2 endpoint and maps sprites from paginated catalogue data', async () => {
    const result = firstValueFrom(api.getPage$(25, 100));
    const request = http.expectOne(POKE_API_URL);
    request.flush({
      data: {
        pokemon: [
          { ...apiPokemon, pokemonsprites: [{ sprites: 'https://example.com/pikachu.png' }] },
        ],
        pokemon_aggregate: { aggregate: { count: 1351 } },
      },
    });
    const page = await result;
    expect(request.request.url).toBe('https://graphql.pokeapi.co/v1beta2');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.body.variables).toEqual({ limit: 25, offset: 100 });
    expect(request.request.body.query).not.toContain('pokemon_v2_');
    expect(page).toMatchObject({
      total: 1351,
      items: [
        {
          id: 25,
          types: ['electric'],
          stats: { attack: 31 },
          sprite: 'https://example.com/pikachu.png',
        },
      ],
    });
  });

  it('hydrates team IDs using the new pokemon root', async () => {
    const result = firstValueFrom(api.getByIds$([25, 157]));
    const request = http.expectOne(POKE_API_URL);
    request.flush({
      data: { pokemon: [apiPokemon, { ...apiPokemon, id: 157, name: 'typhlosion' }] },
    });
    expect((await result).map((pokemon) => pokemon.id)).toEqual([25, 157]);
    expect(request.request.body.operationName).toBe('GetPokemonByIds');
    expect(request.request.body.variables).toEqual({ ids: [25, 157] });
    expect(request.request.body.query).not.toContain('pokemon_v2_');
  });

  it('maps the renamed ability relations, hidden flags, and missing English descriptions', async () => {
    const result = firstValueFrom(api.getDetail$(25));
    const request = http.expectOne(POKE_API_URL);
    request.flush({
      data: {
        pokemon: [apiPokemon],
        pokemonability: [
          {
            is_hidden: false,
            ability: {
              name: 'static',
              abilityeffecttexts: [{ short_effect: 'May paralyze on contact.' }],
            },
          },
          { is_hidden: true, ability: { name: 'lightning-rod', abilityeffecttexts: [] } },
        ],
      },
    });
    expect(await result).toMatchObject({
      pokemon: { id: 25, name: 'pikachu' },
      abilities: [
        { name: 'static', effect: 'May paralyze on contact.', hidden: false },
        { name: 'lightning-rod', effect: 'No English description is available.', hidden: true },
      ],
    });
    expect(request.request.body.operationName).toBe('GetPokemonDetail');
    expect(request.request.body.variables).toEqual({ id: 25 });
    expect(request.request.body.query).not.toContain('pokemon_v2_');
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
