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
