import assert from 'node:assert/strict';

const endpoint = 'http://localhost:4000';
async function request(query, variables = {}) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(10_000),
  });
  assert.ok(response.ok, `Mock server returned HTTP ${response.status}`);
  const result = await response.json();
  assert.ok(!result.errors?.length, JSON.stringify(result.errors));
  assert.ok(result.data, 'GraphQL response omitted data');
  return result.data;
}

const schema = await request(`query CheckMockSchema {
  __schema {
    queryType { fields { name args { name type { kind name ofType { kind name ofType { kind name } } } } } }
    mutationType { fields { name args { name type { kind name ofType { kind name ofType { kind name } } } } } }
  }
}`);
function typeName(type) {
  if (type.kind === 'NON_NULL') return typeName(type.ofType) + '!';
  if (type.kind === 'LIST') return '[' + typeName(type.ofType) + ']';
  return type.name;
}
const mutations = schema.__schema.mutationType.fields;
for (const [name, expected] of Object.entries({
  createTeam: { trainer_id: 'ID!', name: 'String!', pokemon_ids: '[Int]!', created_at: 'String!' },
  removeTeam: { id: 'ID!' },
})) {
  const field = mutations.find((field) => field.name === name);
  assert.ok(field, `Missing ${name} mutation`);
  const argumentsByName = Object.fromEntries(
    field.args.map((argument) => [argument.name, typeName(argument.type)]),
  );
  assert.deepEqual(argumentsByName, expected);
  console.log(
    `Verified ${name}(${Object.entries(expected)
      .map(([key, type]) => key + ': ' + type)
      .join(', ')})`,
  );
}
const listed = await request(
  'query CheckTeams($page: Int!, $perPage: Int!) { allTeams(page: $page, perPage: $perPage, sortField: "id", sortOrder: "asc") { id name trainer_id pokemon_ids created_at } _allTeamsMeta { count } }',
  { page: 0, perPage: 100 },
);
assert.ok(Array.isArray(listed.allTeams));
console.log(`Read ${listed.allTeams.length} seeded teams`);

const created = await request(
  `mutation VerifyCreate($trainerId: ID!, $name: String!, $pokemonIds: [Int]!, $createdAt: String!) {
  createTeam(trainer_id: $trainerId, name: $name, pokemon_ids: $pokemonIds, created_at: $createdAt) {
    id trainer_id name pokemon_ids created_at
  }
}`,
  {
    trainerId: '1',
    name: 'Endpoint verification',
    pokemonIds: [25, 157],
    createdAt: new Date().toISOString(),
  },
);
const team = created.createTeam;
assert.equal(team.name, 'Endpoint verification');
assert.deepEqual(team.pokemon_ids, [25, 157]);
try {
  const saved = await request('query VerifySaved($id: ID!) { Team(id: $id) { id name } }', {
    id: team.id,
  });
  assert.equal(saved.Team.id, team.id);
} finally {
  const removed = await request('mutation VerifyDelete($id: ID!) { removeTeam(id: $id) { id } }', {
    id: team.id,
  });
  assert.equal(removed.removeTeam.id, team.id);
}
const after = await request('query VerifyCleanup($id: ID!) { Team(id: $id) { id } }', {
  id: team.id,
});
assert.equal(after.Team, null);
console.log('PASS: live team query, create, read-back, delete and cleanup');
