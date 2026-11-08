import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, rename, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = await mkdtemp(join(tmpdir(), 'pokedex-persistence-'));
const reservation = createServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const address = reservation.address();
if (!address || typeof address === 'string') throw new Error('No test port available');
const port = address.port;
await new Promise((resolve) => reservation.close(resolve));
let child;
async function start() {
  child = spawn(process.execPath, ['scripts/mock-server.cjs'], {
    env: {
      ...process.env,
      POKEDEX_MOCK_PORT: String(port),
      POKEDEX_DATA_FILE: join(directory, 'database', 'data.json'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Mock startup timed out')), 10000);
    child.stdout.once('data', () => {
      clearTimeout(timer);
      resolve();
    });
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Mock exited: ${code}`));
    });
  });
}
async function stop() {
  if (child && child.exitCode === null) {
    const exited = once(child, 'exit');
    child.kill();
    await exited;
  }
}
async function request(query) {
  const response = await fetch(`http://localhost:${port}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.errors, undefined, JSON.stringify(result.errors));
  return result.data;
}
try {
  await start();
  const { createTeam } = await request(
    'mutation PersistTeam { createTeam(trainer_id:1,name:"Persistence check",pokemon_ids:[1,6],created_at:"2026-11-08") { id } }',
  );
  await rename(join(directory, 'database'), join(directory, 'backup'));
  await writeFile(join(directory, 'database'), 'blocks writes');
  await assert.rejects(() =>
    request(
      'mutation CannotSave { createTeam(trainer_id:1,name:"Must roll back",pokemon_ids:[6],created_at:"2026-11-08") { id } }',
    ),
  );
  await rm(join(directory, 'database'));
  await rename(join(directory, 'backup'), join(directory, 'database'));
  const rolledBack = await request('query AfterWriteFailure { allTeams { name } }');
  assert.equal(
    rolledBack.allTeams.some((team) => team.name === 'Must roll back'),
    false,
  );
  await stop();
  await start();
  const { allTeams } = await request('query SavedTeams { allTeams { id name pokemon_ids } }');
  assert.deepEqual(allTeams.find((team) => team.id === createTeam.id)?.pokemon_ids, [1, 6]);
  for (const team of allTeams)
    await request(`mutation DeleteSavedTeam { removeTeam(id:${JSON.stringify(team.id)}) { id } }`);
  await stop();
  await start();
  assert.deepEqual(
    (await request('query EmptyTeams { allTeams { id name pokemon_ids } }')).allTeams,
    [],
  );
  await request(
    'mutation CreateAfterEmptyRestart { createTeam(trainer_id:1,name:"New expedition",pokemon_ids:[25],created_at:"2026-11-08") { id name pokemon_ids } }',
  );
  console.log(
    'PASS: failed disk writes roll back; saved teams and deletions survive restart; schema remains complete with an empty saved database. Temporary port/file only.',
  );
} finally {
  await stop();
  await rm(directory, { recursive: true, force: true });
}
