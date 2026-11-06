import assert from 'node:assert/strict';
const response = await fetch('https://beta.pokeapi.co/graphql/v1beta', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `query CheckPokemonEndpoint {
    pokemon_v2_pokemon(limit: 1, order_by: {id: asc}) {
      id name height weight
      pokemon_v2_pokemontypes { pokemon_v2_type { name } }
      pokemon_v2_pokemonstats { base_stat pokemon_v2_stat { name } }
      pokemon_v2_pokemonsprites { sprites(path: "front_default") }
    }
    pokemon_v2_pokemon_aggregate { aggregate { count } }
    pokemon_v2_pokemonability(where: {pokemon_id: {_eq: 25}}) {
      is_hidden pokemon_v2_ability { name pokemon_v2_abilityeffecttexts(where: {language_id: {_eq: 9}}) { short_effect } }
    }
  }`,
  }),
  signal: AbortSignal.timeout(25_000),
});
assert.ok(response.ok, `PokéAPI returned HTTP ${response.status}`);
const result = await response.json();
assert.ok(!result.errors?.length, JSON.stringify(result.errors));
assert.ok(result.data?.pokemon_v2_pokemon.length);
console.log(JSON.stringify(result.data, null, 2));
