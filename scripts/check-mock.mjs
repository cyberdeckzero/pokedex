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
console.log(JSON.stringify(schema, null, 2));
const listed = await request(
  'query CheckTeams { allTeams { id name trainer_id pokemon_ids created_at } }',
);
assert.ok(Array.isArray(listed.allTeams));
console.log(`Read ${listed.allTeams.length} seeded teams`);
// Mutation verification is added after inspecting the generated argument types.

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
const after = await request('query VerifyCleanup { allTeams { id } }');
assert.ok(!after.allTeams.some((item) => item.id === team.id));
console.log('PASS: live team query, create, read-back, delete and cleanup');
