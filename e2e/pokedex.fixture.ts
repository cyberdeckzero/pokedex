import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Page, Route, test as base } from '@playwright/test';
import records from './fixtures/pokemon.json';

const statNames = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
const pokemon = records.map((record) => ({
  id: record.id,
  name: record.name,
  height: record.height,
  weight: record.weight,
  pokemontypes: record.types.map((name) => ({ type: { name } })),
  pokemonstats: record.stats.map((base_stat, index) => ({
    base_stat,
    stat: { name: statNames[index] },
  })),
  pokemonsprites: [
    {
      sprites: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${record.id}.png`,
    },
  ],
}));
interface MockTeam {
  id: string;
  trainer_id: string;
  name: string;
  pokemon_ids: number[];
  created_at: string;
}
export interface MockApi {
  catalogueRequests: number;
  catalogueError: boolean;
  teamsError: boolean;
  detailsError: boolean;
  hydrationError: boolean;
  createError: boolean;
  deleteError: boolean;
  catalogueGate: Promise<void> | null;
  teamsGate: Promise<void> | null;
  mutationGate: Promise<void> | null;
  teams: MockTeam[];
}
interface Operation {
  operationName: string;
  variables: {
    id?: string | number;
    ids?: number[];
    offset?: number;
    limit?: number;
    name?: string;
    pokemonIds?: number[];
  };
}
const json = (route: Route, data: object) => route.fulfill({ json: { data } });

async function mockApi(page: Page): Promise<MockApi> {
  const state: MockApi = {
    catalogueRequests: 0,
    catalogueError: false,
    teamsError: false,
    detailsError: false,
    hydrationError: false,
    createError: false,
    deleteError: false,
    catalogueGate: null,
    teamsGate: null,
    mutationGate: null,
    teams: [
      {
        id: '1',
        trainer_id: '1',
        name: 'Forest Patrol',
        pokemon_ids: [1, 12, 25],
        created_at: '2026-11-07',
      },
      {
        id: '2',
        trainer_id: '1',
        name: 'Coastal Crew',
        pokemon_ids: [7, 9, 131],
        created_at: '2026-11-07',
      },
    ],
  };
  await page.route('https://raw.githubusercontent.com/PokeAPI/sprites/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    const id = path.split('/').at(-1);
    const file = resolve(
      'e2e/fixtures/images',
      path.includes('/official-artwork/') ? `art-${id}` : (id ?? 'missing'),
    );
    return route.fulfill({
      path: existsSync(file) ? file : resolve('public/assets/pokemon-fallback.svg'),
    });
  });
  await page.route('https://graphql.pokeapi.co/v1beta2', async (route) => {
    const { operationName, variables }: Operation = route.request().postDataJSON();
    if (operationName === 'GetPokemon') {
      state.catalogueRequests++;
      if (state.catalogueGate) await state.catalogueGate;
      if (state.catalogueError) return route.abort('failed');
      return json(route, {
        pokemon: pokemon.slice(
          variables.offset ?? 0,
          (variables.offset ?? 0) + (variables.limit ?? 100),
        ),
        pokemon_aggregate: { aggregate: { count: pokemon.length } },
      });
    }
    if (operationName === 'GetPokemonByIds') {
      if (state.hydrationError) return route.abort('failed');
      return json(route, { pokemon: pokemon.filter((p) => variables.ids?.includes(p.id)) });
    }
    if (state.detailsError)
      return route.fulfill({ json: { errors: [{ message: 'Simulated detail failure' }] } });
    return json(route, {
      pokemon: pokemon.filter((p) => p.id === variables.id),
      pokemonability: [
        {
          is_hidden: false,
          ability: {
            name: 'overgrow',
            abilityeffecttexts: [{ short_effect: 'Strengthens Grass moves when HP is low.' }],
          },
        },
      ],
    });
  });
  await page.route('http://localhost:4000/**', async (route) => {
    const { operationName, variables }: Operation = route.request().postDataJSON();
    if (operationName === 'GetTeams') {
      if (state.teamsGate) await state.teamsGate;
      if (state.teamsError) return route.abort('failed');
      return json(route, { allTeams: state.teams, _allTeamsMeta: { count: state.teams.length } });
    }
    if (state.mutationGate) await state.mutationGate;
    if (
      (operationName === 'CreateTeam' && state.createError) ||
      (operationName === 'DeleteTeam' && state.deleteError)
    )
      return route.abort('failed');
    if (operationName === 'CreateTeam') {
      const team = {
        id: String(state.teams.length + 10),
        trainer_id: '1',
        name: variables.name ?? '',
        pokemon_ids: variables.pokemonIds ?? [],
        created_at: '2026-11-07',
      };
      state.teams.push(team);
      return json(route, { createTeam: team });
    }
    state.teams = state.teams.filter((team) => team.id !== variables.id);
    return json(route, { removeTeam: { id: variables.id } });
  });
  return state;
}

export const test = base.extend<{ api: MockApi }>({
  api: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await use(await mockApi(page));
      base.expect(errors, 'uncaught browser errors').toEqual([]);
    },
    { auto: true },
  ],
});
export function catalogueItems(page: Page) {
  return page.locator(
    '.pokedex__scroll:visible tbody tr, .pokedex__cards:visible app-pokemon-card',
  );
}
export { expect } from '@playwright/test';
export async function openCatalogue(page: Page) {
  await page.goto('/');
  await base.expect(catalogueItems(page)).toHaveCount(10);
  await base.expect(page.getByRole('button', { name: 'Forest Patrol', exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
