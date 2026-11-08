import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder } from '@angular/forms';
import {
  Subject,
  catchError,
  distinctUntilChanged,
  exhaustMap,
  finalize,
  map,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { LoadResult } from '../../common/models/request-state.model';
import { Pokemon } from '../../pokedex/models/pokemon.model';
import { PokemonStore } from '../../pokedex/state/pokemon.store';
import { TEAM_DRAFT_KEY } from '../constants/team.constants';
import { TeamStore } from '../state/team.store';
import {
  normalizeTeamName,
  teamMembersValidator,
  teamNameValidator,
  uniqueTeamNameValidator,
} from '../validators/team.validators';

@Injectable({ providedIn: 'root' })
export class TeamDraftService {
  private readonly teamStore = inject(TeamStore);
  private readonly pokemonStore = inject(PokemonStore);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly hydrationRequests = new Subject<void>();
  private readonly submitRequests = new Subject<void>();
  private readonly createdSubject = new Subject<string>();
  readonly created$ = this.createdSubject.asObservable();
  readonly isSubmitting = signal(false);
  readonly savedMessage = signal('');
  readonly teamState = toSignal(this.teamStore.state$, { requireSync: true });
  readonly form = this.createForm();
  readonly formStatus = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  readonly selectedIds = toSignal<readonly number[]>(
    this.form.controls.pokemonIds.valueChanges.pipe(startWith(this.form.controls.pokemonIds.value)),
    { requireSync: true },
  );
  private readonly pokemon = toSignal(this.pokemonStore.pokemon$, { initialValue: [] });
  readonly hydration = toSignal(
    this.form.controls.pokemonIds.valueChanges.pipe(
      startWith(this.form.controls.pokemonIds.value),
      distinctUntilChanged((a, b) => a.join(',') === b.join(',')),
      switchMap((ids) =>
        this.hydrationRequests.pipe(
          startWith(undefined),
          switchMap(() =>
            ids.length
              ? this.pokemonStore.ensurePokemon$(ids).pipe(
                  map((data): LoadResult<readonly Pokemon[]> => ({ status: 'success', data })),
                  startWith<LoadResult<readonly Pokemon[]>>({ status: 'loading' }),
                  catchError(() =>
                    of<LoadResult<readonly Pokemon[]>>({
                      status: 'error',
                      message: 'Draft Pokémon could not load. Your choices are saved.',
                    }),
                  ),
                )
              : of<LoadResult<readonly Pokemon[]>>({ status: 'success', data: [] }),
          ),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } },
  );
  readonly selectedPokemon = computed(() => {
    const hydrated = this.hydration();
    const byId = new Map(
      [...this.pokemon(), ...(hydrated.status === 'success' ? hydrated.data : [])].map((item) => [
        item.id,
        item,
      ]),
    );
    return this.selectedIds().map((id) => ({ id, pokemon: byId.get(id) }));
  });
  readonly canSubmit = computed(
    () =>
      this.formStatus() === 'VALID' &&
      this.teamState().status === 'success' &&
      this.hydration().status === 'success' &&
      !this.teamState().busy &&
      !this.isSubmitting(),
  );
  private readonly validationKey = computed(
    () =>
      this.teamState().status +
      ':' +
      this.teamState()
        .teams.map((team) => team.name)
        .join('|'),
  );
  private readonly submitAction = toSignal(
    this.submitRequests.pipe(
      exhaustMap(() => {
        this.isSubmitting.set(true);
        this.savedMessage.set('');
        const draft = this.form.getRawValue();
        return this.teamStore
          .create$({ name: normalizeTeamName(draft.name), pokemonIds: draft.pokemonIds })
          .pipe(
            tap((team) => {
              if (!team) return;
              this.form.reset({ name: '', pokemonIds: [] });
              this.savedMessage.set(`“${team.name}” saved.`);
              this.createdSubject.next(team.id);
            }),
            finalize(() => this.isSubmitting.set(false)),
          );
      }),
    ),
  );

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.persist());
    effect(() => {
      this.validationKey();
      untracked(() => this.form.controls.name.updateValueAndValidity());
    });
  }

  /** Adds one member to the shared draft and reports why an addition was blocked. */
  addPokemon(id: number): 'added' | 'duplicate' | 'full' | 'busy' {
    const control = this.form.controls.pokemonIds;
    if (this.isSubmitting() || this.teamState().busy) return 'busy';
    if (control.value.includes(id)) return 'duplicate';
    if (control.value.length >= 6) return 'full';
    control.setValue([...control.value, id]);
    control.markAsDirty();
    control.markAsTouched();
    return 'added';
  }

  /** Removes a member while preserving the rest of the unfinished team. */
  removePokemon(id: number): void {
    if (this.isSubmitting() || this.teamState().busy) return;
    const control = this.form.controls.pokemonIds;
    control.setValue(control.value.filter((item) => item !== id));
    control.markAsDirty();
    control.markAsTouched();
  }

  /** Trims extra spaces when the team name leaves focus. */
  normalizeName(): void {
    const name = this.form.controls.name;
    const normalized = normalizeTeamName(name.value);
    if (normalized !== name.value) name.setValue(normalized);
  }

  /** Saves a valid draft; failed saves retain its form and persisted values. */
  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.valid && this.canSubmit()) this.submitRequests.next();
  }

  /** Retries member details without changing selected IDs. */
  retryHydration(): void {
    this.hydrationRequests.next();
  }

  private createForm() {
    const restored = this.restore();
    return this.fb.group({
      name: this.fb.control(restored.name, {
        validators: teamNameValidator,
        asyncValidators: uniqueTeamNameValidator(this.teamStore.state$),
      }),
      pokemonIds: this.fb.control<number[]>(restored.pokemonIds, {
        validators: teamMembersValidator,
      }),
    });
  }

  private restore(): { name: string; pokemonIds: number[] } {
    try {
      const raw = localStorage.getItem(TEAM_DRAFT_KEY);
      const value: unknown = raw ? JSON.parse(raw) : null;
      if (
        value &&
        typeof value === 'object' &&
        'name' in value &&
        typeof value.name === 'string' &&
        value.name.length <= 200 &&
        'pokemonIds' in value &&
        Array.isArray(value.pokemonIds) &&
        value.pokemonIds.length <= 6 &&
        new Set(value.pokemonIds).size === value.pokemonIds.length &&
        value.pokemonIds.every(
          (id: unknown): id is number =>
            typeof id === 'number' && Number.isSafeInteger(id) && id > 0,
        )
      )
        return { name: value.name, pokemonIds: [...value.pokemonIds] };
    } catch {
      /* A malformed or unavailable store must not prevent editing. */
    }
    return { name: '', pokemonIds: [] };
  }

  private persist(): void {
    try {
      const draft = this.form.getRawValue();
      if (draft.name || draft.pokemonIds.length)
        localStorage.setItem(TEAM_DRAFT_KEY, JSON.stringify(draft));
      else localStorage.removeItem(TEAM_DRAFT_KEY);
    } catch {
      /* The current form remains usable without browser storage. */
    }
  }
}
