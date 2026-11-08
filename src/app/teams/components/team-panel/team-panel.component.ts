import { TypeCoverageComponent } from '../type-coverage/type-coverage.component';
import { TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Subject,
  catchError,
  distinctUntilChanged,
  exhaustMap,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { SkeletonComponent } from '../../../common/components/skeleton/skeleton.component';
import { LoadResult } from '../../../common/models/request-state.model';
import { PokemonSpriteComponent } from '../../../pokedex/components/pokemon-sprite/pokemon-sprite.component';
import { PokemonStore } from '../../../pokedex/state/pokemon.store';
import { DEFAULT_TRAINER_ID, SELECTED_TEAM_KEY } from '../../constants/team.constants';
import { Team } from '../../models/team.model';
import { TeamStore } from '../../state/team.store';
import { TeamBuilderComponent } from '../team-builder/team-builder.component';

@Component({
  selector: 'app-team-panel',
  standalone: true,
  imports: [
    TitleCasePipe,
    PokemonSpriteComponent,
    TeamBuilderComponent,
    SkeletonComponent,
    TypeCoverageComponent,
  ],
  templateUrl: './team-panel.component.html',
  styleUrl: './team-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamPanelComponent {
  private readonly store = inject(TeamStore);
  private readonly pokemonStore = inject(PokemonStore);
  private readonly loadRequests = new Subject<void>();
  private readonly hydrationRequests = new Subject<void>();
  private readonly deleteRequests = new Subject<string>();
  private readonly restored = signal(false);
  readonly pendingDeleteId = signal<string | null>(null);
  private deleteTrigger: HTMLElement | null = null;
  private readonly cancelDeleteButton =
    viewChild<ElementRef<HTMLButtonElement>>('cancelDeleteControl');
  readonly selectedTeamId = signal<string | null>(null);
  readonly state = toSignal(this.store.state$, { requireSync: true });
  readonly teams = computed(() =>
    this.state().teams.filter((team) => team.trainerId === DEFAULT_TRAINER_ID),
  );
  private readonly pokemon = toSignal(this.pokemonStore.pokemon$, { initialValue: [] });
  private readonly pokemonById = computed(
    () => new Map(this.pokemon().map((pokemon) => [pokemon.id, pokemon])),
  );
  readonly selectedTeam = computed(() =>
    this.state().status === 'success'
      ? (this.teams().find((team) => team.id === this.selectedTeamId()) ?? null)
      : null,
  );
  readonly selectedMembers = computed(() => {
    const team = this.selectedTeam();
    return team ? this.membersFor(team) : [];
  });
  readonly totalBaseStats = computed(() =>
    this.selectedMembers().reduce((total, pokemon) => total + pokemon.total, 0),
  );
  readonly typeDistribution = computed(() => {
    const counts = new Map<string, number>();
    this.selectedMembers().forEach((pokemon) =>
      pokemon.types.forEach((type) => counts.set(type, (counts.get(type) ?? 0) + 1)),
    );
    return [...counts]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  });
  private readonly loadAction = toSignal(
    this.loadRequests.pipe(
      startWith(undefined),
      exhaustMap(() => this.store.load$()),
    ),
  );
  private readonly deleteAction = toSignal(
    this.deleteRequests.pipe(exhaustMap((id) => this.store.delete$(id))),
  );
  readonly hydration = toSignal(
    this.store.state$.pipe(
      map((state) =>
        state.status === 'success'
          ? [
              ...new Set(
                state.teams
                  .filter((team) => team.trainerId === DEFAULT_TRAINER_ID)
                  .flatMap((team) => team.pokemonIds),
              ),
            ].sort((a, b) => a - b)
          : [],
      ),
      distinctUntilChanged((a, b) => a.join(',') === b.join(',')),
      switchMap((ids) =>
        this.hydrationRequests.pipe(
          startWith(undefined),
          switchMap(() =>
            this.pokemonStore.ensurePokemon$(ids).pipe(
              map((): LoadResult<void> => ({ status: 'success', data: undefined })),
              startWith<LoadResult<void>>({ status: 'loading' }),
              catchError(() =>
                of<LoadResult<void>>({
                  status: 'error',
                  message: 'Team Pokémon could not load. Retry to see sprites, types, and stats.',
                }),
              ),
            ),
          ),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } },
  );

  constructor() {
    effect(() => this.cancelDeleteButton()?.nativeElement.focus());
    effect(() => {
      const state = this.state();
      if (state.status !== 'success' || state.busy) return;
      const teams = this.teams().filter((team) => !team.pending);
      if (!this.restored()) {
        let saved: string | null = null;
        try {
          saved = localStorage.getItem(SELECTED_TEAM_KEY);
        } catch {
          /* Selection still works without browser storage. */
        }
        this.selectedTeamId.set(
          teams.find((team) => team.id === saved)?.id ?? teams[0]?.id ?? null,
        );
        this.restored.set(true);
      } else if (!teams.some((team) => team.id === this.selectedTeamId())) {
        this.selectedTeamId.set(teams[0]?.id ?? null);
      }
    });
    effect(() => {
      if (!this.restored() || this.state().status !== 'success' || this.state().busy) return;
      const id = this.selectedTeamId();
      if (id && !this.teams().some((team) => team.id === id && !team.pending)) return;
      try {
        if (id) localStorage.setItem(SELECTED_TEAM_KEY, id);
        else localStorage.removeItem(SELECTED_TEAM_KEY);
      } catch {
        /* Storage may be disabled or full; shared state remains in memory. */
      }
    });
  }
  retryTeams(): void {
    this.loadRequests.next();
  }
  retryHydration(): void {
    this.hydrationRequests.next();
  }
  requestDelete(id: string, event: Event): void {
    if (this.state().busy) return;
    this.deleteTrigger = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    this.pendingDeleteId.set(id);
  }
  cancelDelete(): void {
    this.pendingDeleteId.set(null);
    this.deleteTrigger?.focus();
  }
  confirmDelete(id: string): void {
    if (this.pendingDeleteId() !== id || this.state().busy) return;
    this.pendingDeleteId.set(null);
    this.deleteRequests.next(id);
  }
  deleteTeam(id: string): void {
    // A failed deletion was already confirmed, so Retry can repeat it immediately.
    if (this.state().failedDeleteId === id) this.deleteRequests.next(id);
  }
  selectTeam(id: string): void {
    if (!this.state().busy) this.selectedTeamId.set(id);
  }
  membersFor(team: Team) {
    return team.pokemonIds.flatMap((id) => {
      const pokemon = this.pokemonById().get(id);
      return pokemon ? [pokemon] : [];
    });
  }
}
