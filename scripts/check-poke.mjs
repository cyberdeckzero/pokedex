import assert from 'node:assert/strict';

const endpoint = 'https://graphql.pokeapi.co/v1beta2';
const fields = `
  id name height weight
  pokemontypes(order_by: {slot: asc}) { type { name } }
  pokemonstats { base_stat stat { name } }
  pokemonsprites { sprites(path: "front_default") }
`;

async function request(operationName, query, variables) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operationName, query, variables }),
    signal: AbortSignal.timeout(25_000),
  });
  assert.ok(response.ok, `PokéAPI returned HTTP ${response.status}`);
  const result = await response.json();
  assert.ok(!result.errors?.length, JSON.stringify(result.errors));
  assert.ok(result.data, 'PokéAPI omitted response data');
  return result.data;
}

function checkPokemon(pokemon) {
  assert.ok(Number.isInteger(pokemon.id));
  assert.ok(pokemon.name);
  assert.equal(pokemon.pokemonstats.length, 6);
  assert.ok(pokemon.pokemontypes.length);
  assert.ok(Array.isArray(pokemon.pokemonsprites));
}

const page = await request(
  'CheckPokemonPage',
  `query CheckPokemonPage($limit: Int!, $offset: Int!) {
  pokemon(limit: $limit, offset: $offset, order_by: {id: asc}) { ${fields} }
  pokemon_aggregate { aggregate { count } }
}`,
  { limit: 2, offset: 100 },
);
assert.equal(page.pokemon.length, 2);
page.pokemon.forEach(checkPokemon);
assert.ok(page.pokemon_aggregate.aggregate.count > 100);
console.log(
  `PASS: paginated catalogue, types, six stats, sprites; ${page.pokemon_aggregate.aggregate.count} Pokémon available`,
);

const ids = [25, 6, 9, 3, 131, 143, 157, 181, 214, 248, 197, 169];
const members = await request(
  'CheckTeamPokemon',
  `query CheckTeamPokemon($ids: [Int!]!) {
  pokemon(where: {id: {_in: $ids}}, order_by: {id: asc}) { ${fields} }
}`,
  { ids },
);
assert.deepEqual(
  members.pokemon.map((pokemon) => pokemon.id),
  [...ids].sort((a, b) => a - b),
);
members.pokemon.forEach(checkPokemon);
console.log('PASS: all 12 Pokémon referenced by the default trainer’s seeded teams');

const detail = await request(
  'CheckPokemonDetail',
  `query CheckPokemonDetail($id: Int!) {
  pokemon(where: {id: {_eq: $id}}) { ${fields} }
  pokemonability(where: {pokemon_id: {_eq: $id}}, order_by: {slot: asc}) {
    is_hidden ability { name abilityeffecttexts(where: {language_id: {_eq: 9}}) { short_effect } }
  }
}`,
  { id: 25 },
);
assert.equal(detail.pokemon[0].id, 25);
checkPokemon(detail.pokemon[0]);
assert.ok(detail.pokemonability.length);
assert.ok(detail.pokemonability.some((item) => item.ability.name === 'static'));
assert.ok(detail.pokemonability.some((item) => item.is_hidden));
assert.ok(
  detail.pokemonability.some((item) =>
    item.ability.abilityeffecttexts.some((text) => text.short_effect),
  ),
);
console.log(
  'PASS: Pokémon details, regular/hidden abilities, and English effect descriptions without authentication',
);
