import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  defer,
  finalize,
  map,
  of,
  shareReplay,
  tap,
} from 'rxjs';
import { DEFAULT_TRAINER_ID } from '../constants/team.constants';
import { NewTeam, Team, TeamState } from '../models/team.model';
import { TeamApiService } from '../services/team-api.service';
import { normalizeTeamName } from '../validators/team.validators';

@Injectable({ providedIn: 'root' })
export class TeamStore {
  private readonly api = inject(TeamApiService);
  private readonly stateSubject = new BehaviorSubject<TeamState>({
    teams: [],
    status: 'idle',
    error: null,
    busy: false,
    mutationError: null,
    failedDeleteId: null,
  });
  private loadRequest?: Observable<void>;
  private temporaryId = 0;
  readonly state$ = this.stateSubject.asObservable();

  /** Loads teams with explicit status; reloads and mutations cannot overwrite one another. */
  load$(): Observable<void> {
    return defer(() => {
      if (this.stateSubject.value.busy) return of(undefined);
      if (this.loadRequest) return this.loadRequest;
      this.loadRequest = defer(() => {
        this.patch({ status: 'loading', error: null });
        return this.api.getTeams$().pipe(
          tap((teams) => this.patch({ teams, status: 'success', error: null })),
          map(() => undefined),
          catchError(() => {
            this.patch({
              status: 'error',
              error: 'Teams could not load. Start the mock server on port 4000, then retry.',
            });
            return of(undefined);
          }),
          finalize(() => {
            this.loadRequest = undefined;
          }),
        );
      }).pipe(shareReplay({ bufferSize: 1, refCount: false }));
      return this.loadRequest;
    });
  }

  /** Adds a pending team immediately, replaces it on success, or removes just that team on failure. */
  create$(draft: NewTeam): Observable<Team | null> {
    return defer(() => {
      const state = this.stateSubject.value;
      if (state.busy || state.status !== 'success') return of(null);
      const name = normalizeTeamName(draft.name);
      if (
        name.length < 3 ||
        name.length > 30 ||
        draft.pokemonIds.length < 1 ||
        draft.pokemonIds.length > 6 ||
        new Set(draft.pokemonIds).size !== draft.pokemonIds.length ||
        state.teams.some(
          (team) => normalizeTeamName(team.name).toLowerCase() === name.toLowerCase(),
        )
      ) {
        this.patch({
          mutationError: 'Check the team name and choose one to six different Pokémon.',
        });
        return of(null);
      }
      const pending: Team = {
        id: `pending-${++this.temporaryId}`,
        trainerId: DEFAULT_TRAINER_ID,
        name,
        pokemonIds: [...draft.pokemonIds],
        createdAt: new Date().toISOString(),
        pending: true,
      };
      this.patch({
        teams: [...state.teams, pending],
        busy: true,
        mutationError: null,
        failedDeleteId: null,
      });
      return this.api.createTeam$({ name, pokemonIds: pending.pokemonIds }).pipe(
        tap((saved) =>
          this.patch({
            teams: this.stateSubject.value.teams.map((team) =>
              team.id === pending.id ? saved : team,
            ),
          }),
        ),
        catchError(() => {
          this.patch({
            teams: this.stateSubject.value.teams.filter((team) => team.id !== pending.id),
            mutationError:
              'The team could not be saved. Your choices are still in the form; try again.',
          });
          return of(null);
        }),
        finalize(() => this.patch({ busy: false })),
        // A view being destroyed must not cancel an already-sent create and leave a pending team behind.
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    });
  }

  /** Removes one team optimistically and restores only that team if deletion fails. */
  delete$(id: string): Observable<boolean> {
    return defer(() => {
      const state = this.stateSubject.value;
      const index = state.teams.findIndex((team) => team.id === id);
      const removed = state.teams[index];
      if (
        state.busy ||
        state.status !== 'success' ||
        !removed ||
        removed.pending ||
        removed.trainerId !== DEFAULT_TRAINER_ID
      )
        return of(false);
      this.patch({
        teams: state.teams.filter((team) => team.id !== id),
        busy: true,
        mutationError: null,
        failedDeleteId: null,
      });
      return this.api.deleteTeam$(id).pipe(
        map(() => true),
        catchError(() => {
          const teams = [...this.stateSubject.value.teams];
          if (!teams.some((team) => team.id === id))
            teams.splice(Math.min(index, teams.length), 0, removed);
          this.patch({
            teams,
            mutationError: `“${removed.name}” could not be deleted. It has been restored.`,
            failedDeleteId: id,
          });
          return of(false);
        }),
        finalize(() => this.patch({ busy: false })),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    });
  }

  private patch(state: Partial<TeamState>): void {
    this.stateSubject.next({ ...this.stateSubject.value, ...state });
  }
}
