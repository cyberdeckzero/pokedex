import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { POKE_API_URL } from './pokedex/constants/pokemon.constants';
import { SELECTED_TEAM_KEY, TEAM_API_URL } from './teams/constants/team.constants';

const row = {
  id: '1',
  trainer_id: '1',
  name: 'Kanto Starters',
  pokemon_ids: [25],
  created_at: '2024-01-15',
};
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
  ].map((name) => ({ base_stat: 50, pokemon_v2_stat: { name } })),
  pokemon_v2_pokemonsprites: [{ sprites: null }],
};

describe('application team-building flow', () => {
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });
  it('renders browse data, creates from the real form, and restores then retries a failed delete', async () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AppComponent);
    const element: HTMLElement = fixture.nativeElement;
    fixture.detectChanges();
    expect(element.textContent).toContain('Preparing your Pokédex');
    expect(element.textContent).toContain('Loading your teams');
    http.expectOne(TEAM_API_URL).flush({ data: { allTeams: [row], _allTeamsMeta: { count: 1 } } });
    http
      .expectOne((request) => request.body.operationName === 'GetPokemonByIds')
      .flush({ data: { pokemon_v2_pokemon: [apiPokemon] } });
    await vi.advanceTimersByTimeAsync(300);
    http.expectOne(POKE_API_URL).flush({
      data: {
        pokemon_v2_pokemon: [apiPokemon],
        pokemon_v2_pokemon_aggregate: { aggregate: { count: 1 } },
      },
    });
    fixture.detectChanges();
    expect(element.querySelector('tbody')?.textContent).toContain('Pikachu');
    expect(element.textContent).toContain('Kanto Starters');

    const name = element.querySelector<HTMLInputElement>('#team-name');
    const picker = element.querySelector<HTMLInputElement>('#team-pokemon-search');
    if (!name || !picker) throw new Error('Team form was not rendered');
    name.value = 'Fresh team';
    name.dispatchEvent(new Event('input'));
    picker.value = 'pika';
    picker.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
    picker.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    picker.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(element.querySelector('.builder__chip')?.textContent).toContain('Pikachu');
    const submit = element.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(submit?.disabled).toBe(false);
    submit?.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('.teams__card')).toHaveLength(2);
    expect(element.textContent).toContain('Saving…');
    const create = http.expectOne((request) => request.body.operationName === 'CreateTeam');
    expect(create.request.body.variables.pokemonIds).toEqual([25]);
    create.flush({ data: { createTeam: { ...row, id: '4', name: 'Fresh team' } } });
    fixture.detectChanges();
    expect(name.value).toBe('');
    expect(localStorage.getItem(SELECTED_TEAM_KEY)).toBe('4');

    element.querySelector<HTMLButtonElement>('[aria-label="Delete team Fresh team"]')?.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('.teams__card')).toHaveLength(1);
    http
      .expectOne((request) => request.body.operationName === 'DeleteTeam')
      .flush('offline', { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(element.querySelectorAll('.teams__card')).toHaveLength(2);
    expect(element.textContent).toContain('It has been restored');
    const retry = Array.from(element.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Retry delete'),
    );
    retry?.click();
    http
      .expectOne((request) => request.body.operationName === 'DeleteTeam')
      .flush({ data: { removeTeam: { id: '4' } } });
    fixture.detectChanges();
    expect(element.querySelectorAll('.teams__card')).toHaveLength(1);
    expect(localStorage.getItem(SELECTED_TEAM_KEY)).toBe('1');
    http.verify();
  });
});
