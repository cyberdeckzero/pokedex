import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from, map, mergeMap, switchMap, timeout, toArray } from 'rxjs';
import { GraphqlResponse } from '../../common/models/request-state.model';
import { requireGraphqlData } from '../../common/utils/graphql.util';
import { DEFAULT_TRAINER_ID, TEAM_API_URL } from '../constants/team.constants';
import { NewTeam, Team } from '../models/team.model';

interface ApiTeam {
  id: string;
  trainer_id: string;
  name: string;
  pokemon_ids: number[];
  created_at: string;
}
const TEAM_FIELDS = 'id trainer_id name pokemon_ids created_at';
interface TeamPage {
  allTeams: ApiTeam[];
  _allTeamsMeta: { count: number };
}
const GET_TEAMS = `query GetTeams($page: Int!, $perPage: Int!) { allTeams(page: $page, perPage: $perPage, sortField: "id", sortOrder: "asc") { ${TEAM_FIELDS} } _allTeamsMeta { count } }`;
const CREATE_TEAM = `mutation CreateTeam($trainerId: ID!, $name: String!, $pokemonIds: [Int]!, $createdAt: String!) {
  createTeam(trainer_id: $trainerId, name: $name, pokemon_ids: $pokemonIds, created_at: $createdAt) { ${TEAM_FIELDS} }
}`;
const DELETE_TEAM = `mutation DeleteTeam($id: ID!) { removeTeam(id: $id) { id } }`;

@Injectable({ providedIn: 'root' })
export class TeamApiService {
  private readonly http = inject(HttpClient);

  /** Fetches all trainers' teams so name validation uses the complete existing set. */
  getTeams$(): Observable<readonly Team[]> {
    return this.getPage$(0).pipe(
      switchMap((first) => {
        const pages = Array.from(
          { length: Math.max(0, Math.ceil(first._allTeamsMeta.count / 100) - 1) },
          (_, index) => index + 1,
        );
        return from(pages).pipe(
          mergeMap((page) => this.getPage$(page), 2),
          toArray(),
          map((rest) => [first, ...rest].flatMap((page) => page.allTeams).map(mapTeam)),
        );
      }),
    );
  }

  /** Creates one team for Ash; non-idempotent mutations are never automatically retried. */
  createTeam$(team: NewTeam): Observable<Team> {
    return this.request$<{ createTeam: ApiTeam }>('CreateTeam', CREATE_TEAM, {
      trainerId: DEFAULT_TRAINER_ID,
      name: team.name,
      pokemonIds: team.pokemonIds,
      createdAt: new Date().toISOString(),
    }).pipe(map((data) => mapTeam(data.createTeam)));
  }

  /** Deletes a saved team using the generated schema's ID scalar. */
  deleteTeam$(id: string): Observable<void> {
    return this.request$<{ removeTeam: { id: string } | null }>('DeleteTeam', DELETE_TEAM, {
      id,
    }).pipe(
      map((data) => {
        if (!data.removeTeam) throw new Error('The team was not found.');
      }),
    );
  }

  private getPage$(page: number): Observable<TeamPage> {
    return this.request$<TeamPage>('GetTeams', GET_TEAMS, { page, perPage: 100 });
  }

  private request$<T>(operationName: string, query: string, variables: object): Observable<T> {
    return this.http
      .post<GraphqlResponse<T>>(TEAM_API_URL, { operationName, query, variables })
      .pipe(timeout(10_000), map(requireGraphqlData));
  }
}

function mapTeam(team: ApiTeam): Team {
  return {
    id: team.id,
    trainerId: team.trainer_id,
    name: team.name,
    pokemonIds: team.pokemon_ids,
    createdAt: team.created_at,
  };
}
