import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { TeamBuilderComponent } from './team-builder.component';
import { TeamStore } from '../../state/team.store';
import { TeamState } from '../../models/team.model';
import { PokemonStore } from '../../../pokedex/state/pokemon.store';

const ready: TeamState = {
  teams: [],
  status: 'success',
  error: null,
  busy: false,
  mutationError: null,
  failedDeleteId: null,
};

describe('team builder submission', () => {
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });
  it('restores an unfinished name and members before the catalogue has loaded', () => {
    localStorage.setItem(
      'mini-pokedex:team-draft',
      JSON.stringify({ name: 'Weekend', pokemonIds: [1000] }),
    );
    const ensurePokemon$ = vi.fn().mockReturnValue(of([]));
    TestBed.configureTestingModule({
      imports: [TeamBuilderComponent],
      providers: [
        { provide: TeamStore, useValue: { state$: new BehaviorSubject(ready) } },
        {
          provide: PokemonStore,
          useValue: { pokemon$: of([]), loadCatalogue$: () => of([]), ensurePokemon$ },
        },
      ],
    });
    const fixture = TestBed.createComponent(TeamBuilderComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      name: 'Weekend',
      pokemonIds: [1000],
    });
    expect(ensurePokemon$).toHaveBeenCalledWith([1000]);
  });

  it('keeps useful form values after a failed create and submits a normalized name on retry', async () => {
    vi.useFakeTimers();
    const create$ = vi
      .fn()
      .mockReturnValueOnce(of(null))
      .mockReturnValueOnce(
        of({ id: '4', trainerId: '1', name: 'Fresh team', pokemonIds: [25], createdAt: '' }),
      );
    TestBed.configureTestingModule({
      imports: [TeamBuilderComponent],
      providers: [
        { provide: TeamStore, useValue: { state$: new BehaviorSubject(ready), create$ } },
        {
          provide: PokemonStore,
          useValue: {
            pokemon$: of([]),
            loadCatalogue$: vi.fn().mockReturnValue(of([])),
            ensurePokemon$: vi.fn().mockReturnValue(of([])),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(TeamBuilderComponent);
    fixture.detectChanges();
    const builder = fixture.componentInstance;
    expect(fixture.nativeElement.textContent).not.toContain('Team name is required');
    builder.form.setValue({ name: '  Fresh   team  ', pokemonIds: [25] });
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
    builder.submit();
    fixture.detectChanges();
    expect(builder.form.getRawValue()).toEqual({ name: '  Fresh   team  ', pokemonIds: [25] });
    expect(builder.isSubmitting()).toBe(false);
    builder.submit();
    fixture.detectChanges();
    expect(create$.mock.calls[1][0]).toEqual({ name: 'Fresh team', pokemonIds: [25] });
    expect(builder.form.getRawValue()).toEqual({ name: '', pokemonIds: [] });
  });
});
