import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import { TeamStore } from './team.store';
import { TeamApiService } from '../services/team-api.service';
import { Team } from '../models/team.model';

const original: Team = {
  id: '1',
  trainerId: '1',
  name: 'Kanto Starters',
  pokemonIds: [25],
  createdAt: '2024-01-15',
};

describe('TeamStore optimistic mutations', () => {
  const api = { getTeams$: vi.fn(), createTeam$: vi.fn(), deleteTeam$: vi.fn() };
  let store: TeamStore;

  beforeEach(async () => {
    vi.resetAllMocks();
    api.getTeams$.mockReturnValue(of([original]));
    TestBed.configureTestingModule({ providers: [{ provide: TeamApiService, useValue: api }] });
    store = TestBed.inject(TeamStore);
    await firstValueFrom(store.load$());
  });

  it('shows a temporary team immediately and removes only that team when create fails', async () => {
    const response = new Subject<Team>();
    api.createTeam$.mockReturnValue(response);
    const result = firstValueFrom(store.create$({ name: 'New team', pokemonIds: [6] }));
    let state = await firstValueFrom(store.state$);
    expect(state.teams).toHaveLength(2);
    expect(state.teams[1].pending).toBe(true);
    expect(state.teams[1].id).toMatch(/^pending-/);
    response.error(new Error('offline'));
    expect(await result).toBeNull();
    state = await firstValueFrom(store.state$);
    expect(state.teams).toEqual([original]);
    expect(state.busy).toBe(false);
    expect(state.mutationError).toBeTruthy();
  });

  it('replaces temporary data with the server team and prevents a concurrent submission', async () => {
    const response = new Subject<Team>();
    const saved: Team = { ...original, id: '4', name: 'New team', pokemonIds: [6] };
    api.createTeam$.mockReturnValue(response);
    const result = firstValueFrom(store.create$({ name: saved.name, pokemonIds: [6] }));
    expect(await firstValueFrom(store.create$({ name: 'Other team', pokemonIds: [9] }))).toBeNull();
    expect(api.createTeam$).toHaveBeenCalledTimes(1);
    response.next(saved);
    response.complete();
    expect(await result).toEqual(saved);
    expect((await firstValueFrom(store.state$)).teams).toEqual([original, saved]);
  });

  it('restores a failed deletion without undoing an earlier successful create', async () => {
    const saved: Team = { ...original, id: '4', name: 'Saved team' };
    api.createTeam$.mockReturnValue(of(saved));
    await firstValueFrom(store.create$({ name: saved.name, pokemonIds: [25] }));
    const response = new Subject<void>();
    api.deleteTeam$.mockReturnValue(response);
    const result = firstValueFrom(store.delete$('1'));
    expect((await firstValueFrom(store.state$)).teams).toEqual([saved]);
    response.error(new Error('offline'));
    expect(await result).toBe(false);
    expect((await firstValueFrom(store.state$)).teams).toEqual([original, saved]);
    api.deleteTeam$.mockReturnValue(of(undefined));
    expect(await firstValueFrom(store.delete$('1'))).toBe(true);
    expect((await firstValueFrom(store.state$)).teams).toEqual([saved]);
  });

  it('recovers a failed load when retried', async () => {
    api.getTeams$
      .mockReturnValueOnce(throwError(() => new Error('offline')))
      .mockReturnValueOnce(of([original]));
    await firstValueFrom(store.load$());
    expect((await firstValueFrom(store.state$)).status).toBe('error');
    await firstValueFrom(store.load$());
    expect((await firstValueFrom(store.state$)).status).toBe('success');
  });
});
