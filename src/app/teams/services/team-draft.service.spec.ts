import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { PokemonStore } from '../../pokedex/state/pokemon.store';
import { TeamState } from '../models/team.model';
import { TeamStore } from '../state/team.store';
import { TEAM_DRAFT_KEY } from '../constants/team.constants';
import { TeamDraftService } from './team-draft.service';

const ready: TeamState = {
  teams: [],
  status: 'success',
  error: null,
  busy: false,
  mutationError: null,
  failedDeleteId: null,
};
function setup() {
  const state$ = new BehaviorSubject(ready);
  const create$ = vi.fn().mockReturnValue(of(null));
  const ensurePokemon$ = vi.fn().mockReturnValue(of([]));
  TestBed.configureTestingModule({
    providers: [
      { provide: TeamStore, useValue: { state$, create$ } },
      { provide: PokemonStore, useValue: { pokemon$: of([]), ensurePokemon$ } },
    ],
  });
  return { draft: TestBed.inject(TeamDraftService), state$, create$, ensurePokemon$ };
}
describe('shared team draft', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  it('persists the shared form immediately and rejects duplicate, full, or busy additions', () => {
    const { draft, state$ } = setup();
    draft.form.controls.name.setValue('Weekend');
    expect(draft.addPokemon(25)).toBe('added');
    expect(draft.addPokemon(25)).toBe('duplicate');
    expect(JSON.parse(localStorage.getItem(TEAM_DRAFT_KEY)!)).toEqual({
      name: 'Weekend',
      pokemonIds: [25],
    });
    draft.form.controls.pokemonIds.setValue([1, 2, 3, 4, 5, 6]);
    expect(draft.addPokemon(7)).toBe('full');
    state$.next({ ...ready, busy: true });
    expect(draft.addPokemon(7)).toBe('busy');
    expect(draft.selectedIds()).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it('reorders and inserts members without duplicates, preserving order after refresh', () => {
    const { draft } = setup();
    draft.addPokemon(1);
    draft.addPokemon(6);
    draft.addPokemon(25, 1);
    expect(draft.selectedIds()).toEqual([1, 25, 6]);
    draft.movePokemon(6, 0);
    expect(draft.selectedIds()).toEqual([6, 1, 25]);
    draft.movePokemon(6, -1);
    expect(draft.selectedIds()).toEqual([6, 1, 25]);
    expect(JSON.parse(localStorage.getItem(TEAM_DRAFT_KEY)!).pokemonIds).toEqual([6, 1, 25]);
  });
  it.each([
    '{',
    'null',
    '{"name":123,"pokemonIds":[1]}',
    '{"name":"Draft","pokemonIds":[1,1]}',
    '{"name":"Draft","pokemonIds":[0]}',
    '{"name":"Draft","pokemonIds":[1.5]}',
    '{"name":"Draft","pokemonIds":[1,2,3,4,5,6,7]}',
  ])('ignores invalid stored JSON %s', (value) => {
    localStorage.setItem(TEAM_DRAFT_KEY, value);
    expect(setup().draft.form.getRawValue()).toEqual({ name: '', pokemonIds: [] });
  });
  it('keeps editing available when storage is denied', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const { draft } = setup();
    expect(() => draft.addPokemon(25)).not.toThrow();
    expect(draft.selectedIds()).toEqual([25]);
  });
  it('retains a failed save and clears persistence only on successful save', async () => {
    vi.useFakeTimers();
    const { draft, create$ } = setup();
    draft.form.setValue({ name: 'Weekend', pokemonIds: [25] });
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(300);
    draft.submit();
    expect(draft.form.getRawValue()).toEqual({ name: 'Weekend', pokemonIds: [25] });
    expect(localStorage.getItem(TEAM_DRAFT_KEY)).not.toBeNull();
    create$.mockReturnValue(
      of({ id: '1', trainerId: '1', name: 'Weekend', pokemonIds: [25], createdAt: '' }),
    );
    draft.submit();
    expect(draft.form.getRawValue()).toEqual({ name: '', pokemonIds: [] });
    expect(localStorage.getItem(TEAM_DRAFT_KEY)).toBeNull();
  });
  it('blocks additions and duplicate submissions until the current save finishes', async () => {
    vi.useFakeTimers();
    const { draft, create$ } = setup();
    const response = new Subject<null>();
    create$.mockReturnValue(response);
    draft.form.setValue({ name: 'Weekend', pokemonIds: [25] });
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(300);
    draft.submit();
    expect(draft.isSubmitting()).toBe(true);
    expect(draft.addPokemon(1)).toBe('busy');
    draft.removePokemon(25);
    draft.submit();
    expect(create$).toHaveBeenCalledTimes(1);
    expect(draft.selectedIds()).toEqual([25]);
    response.next(null);
    response.complete();
    expect(draft.isSubmitting()).toBe(false);
    expect(draft.addPokemon(1)).toBe('added');
  });

  it('loads restored members independently and retries after a failure', async () => {
    vi.useFakeTimers();
    localStorage.setItem(TEAM_DRAFT_KEY, JSON.stringify({ name: 'Weekend', pokemonIds: [1000] }));
    const response = new Subject<never>();
    const ensurePokemon$ = vi.fn().mockReturnValueOnce(response).mockReturnValueOnce(of([]));
    TestBed.configureTestingModule({
      providers: [
        { provide: TeamStore, useValue: { state$: new BehaviorSubject(ready) } },
        { provide: PokemonStore, useValue: { pokemon$: of([]), ensurePokemon$ } },
      ],
    });
    const draft = TestBed.inject(TeamDraftService);
    expect(draft.hydration().status).toBe('loading');
    response.error(new Error('offline'));
    expect(draft.hydration().status).toBe('error');
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(300);
    expect(draft.canSubmit()).toBe(false);
    expect(draft.selectedIds()).toEqual([1000]);
    draft.retryHydration();
    expect(draft.hydration().status).toBe('success');
    expect(ensurePokemon$.mock.calls).toEqual([[[1000]], [[1000]]]);
  });
});
