import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { TeamApiService } from './team-api.service';
import { TEAM_API_URL } from '../constants/team.constants';

const row = {
  id: '1',
  trainer_id: '1',
  name: 'Kanto Starters',
  pokemon_ids: [25],
  created_at: '2024-01-15',
};

describe('TeamApiService', () => {
  let api: TeamApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(TeamApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('loads all team pages, including names beyond the mock server default of 25', async () => {
    const result = firstValueFrom(api.getTeams$());
    const first = http.expectOne(TEAM_API_URL);
    expect(first.request.body.variables).toEqual({ page: 0, perPage: 100 });
    first.flush({ data: { allTeams: [row], _allTeamsMeta: { count: 101 } } });
    const second = http.expectOne(TEAM_API_URL);
    expect(second.request.body.variables.page).toBe(1);
    second.flush({
      data: { allTeams: [{ ...row, id: '101', name: 'Last team' }], _allTeamsMeta: { count: 101 } },
    });
    expect((await result).map((team) => team.name)).toEqual(['Kanto Starters', 'Last team']);
  });

  it('rejects HTTP-200 mutation errors without automatically sending another create', async () => {
    const failure = firstValueFrom(api.createTeam$({ name: 'New team', pokemonIds: [25] })).catch(
      (error: unknown) => error,
    );
    const request = http.expectOne(TEAM_API_URL);
    expect(request.request.body.variables.trainerId).toBe('1');
    expect(request.request.body.query).toContain('$pokemonIds: [Int]!');
    request.flush({ errors: [{ message: 'failed' }] });
    expect(await failure).toBeInstanceOf(Error);
    http.expectNone(TEAM_API_URL);
  });
});
