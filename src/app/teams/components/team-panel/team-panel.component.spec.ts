import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { TeamPanelComponent } from './team-panel.component';
import { TeamBuilderComponent } from '../team-builder/team-builder.component';
import { TeamStore } from '../../state/team.store';
import { Team, TeamState } from '../../models/team.model';
import { Pokemon } from '../../../pokedex/models/pokemon.model';
import { PokemonStore } from '../../../pokedex/state/pokemon.store';
import { SELECTED_TEAM_KEY } from '../../constants/team.constants';

const teams: Team[] = [
  { id: '1', trainerId: '1', name: 'Kanto Starters', pokemonIds: [25], createdAt: '' },
  { id: '2', trainerId: '1', name: 'Johto Squad', pokemonIds: [157], createdAt: '' },
];
const initial: TeamState = {
  teams: [],
  status: 'loading',
  error: null,
  busy: false,
  mutationError: null,
  failedDeleteId: null,
};

function setup(
  state$: BehaviorSubject<TeamState>,
  ensurePokemon$: (ids: readonly number[]) => Observable<readonly Pokemon[]> = () => of([]),
) {
  TestBed.configureTestingModule({
    imports: [TeamPanelComponent],
    providers: [
      { provide: TeamStore, useValue: { state$, load$: () => of(undefined), delete$: vi.fn() } },
      { provide: PokemonStore, useValue: { pokemon$: of([]), ensurePokemon$ } },
    ],
  });
  TestBed.overrideTemplate(TeamBuilderComponent, '');
  // The panel test isolates persistence and request states from form construction.
  TestBed.overrideComponent(TeamBuilderComponent, {
    set: {
      providers: [
        { provide: PokemonStore, useValue: { pokemon$: of([]), loadCatalogue$: () => of([]) } },
      ],
    },
  });
  return TestBed.createComponent(TeamPanelComponent);
}

describe('selected-team persistence', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });
  it('waits for teams before restoring and preserves selection through a failed optimistic delete', async () => {
    localStorage.setItem(SELECTED_TEAM_KEY, '2');
    const state$ = new BehaviorSubject(initial);
    const fixture = setup(state$);
    await fixture.whenStable();
    expect(localStorage.getItem(SELECTED_TEAM_KEY)).toBe('2');
    state$.next({ ...initial, status: 'success', teams });
    await fixture.whenStable();
    expect(fixture.componentInstance.selectedTeamId()).toBe('2');
    state$.next({ ...initial, status: 'success', teams: [teams[0]], busy: true });
    await fixture.whenStable();
    expect(localStorage.getItem(SELECTED_TEAM_KEY)).toBe('2');
    state$.next({ ...initial, status: 'success', teams });
    await fixture.whenStable();
    expect(fixture.componentInstance.selectedTeamId()).toBe('2');
    state$.next({ ...initial, status: 'success', teams: [teams[0]] });
    await fixture.whenStable();
    expect(fixture.componentInstance.selectedTeamId()).toBe('1');
    expect(localStorage.getItem(SELECTED_TEAM_KEY)).toBe('1');
  });

  it('keeps team names visible when member hydration fails and retries the same IDs', async () => {
    const response = new Subject<readonly Pokemon[]>();
    const ensurePokemon$ = vi.fn().mockReturnValueOnce(response).mockReturnValueOnce(of([]));
    const fixture = setup(
      new BehaviorSubject<TeamState>({ ...initial, status: 'success', teams }),
      ensurePokemon$,
    );
    await fixture.whenStable();
    expect(fixture.componentInstance.hydration().status).toBe('loading');
    response.error(new Error('offline'));
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Team Pokémon could not load');
    expect(element.textContent).toContain('Johto Squad');
    expect(element.textContent).not.toContain('No teams yet');
    const retry = Array.from(element.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Retry team Pokémon'),
    );
    retry?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.hydration().status).toBe('success');
    expect(ensurePokemon$.mock.calls.map((call) => call[0])).toEqual([
      [25, 157],
      [25, 157],
    ]);
  });

  it('falls back sensibly with an invalid saved ID and unavailable storage', async () => {
    localStorage.setItem(SELECTED_TEAM_KEY, 'invalid');
    const state$ = new BehaviorSubject<TeamState>({
      ...initial,
      status: 'success' as const,
      teams,
    });
    const fixture = setup(state$);
    await fixture.whenStable();
    expect(fixture.componentInstance.selectedTeamId()).toBe('1');
    fixture.destroy();
    TestBed.resetTestingModule();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const other = setup(state$);
    await other.whenStable();
    expect(other.componentInstance.selectedTeamId()).toBe('1');
  });
});
