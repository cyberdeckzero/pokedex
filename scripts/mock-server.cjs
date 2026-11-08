const { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } = require('node:fs');
const { dirname, resolve } = require('node:path');
const express = require('express');
const cors = require('cors');
const jsonGraphqlServer = require('json-graphql-server').default;
const seed = require('../mock/db.cjs');

const file = resolve(process.env.POKEDEX_DATA_FILE || 'mock/data.local.json');
const port = Number(process.env.POKEDEX_MOCK_PORT || 4000);
const loaded = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : seed;
if (!Array.isArray(loaded.trainers) || !Array.isArray(loaded.teams)) {
  throw new Error('The saved mock data must contain trainers and teams arrays.');
}
// Infer the complete schema from the supplied seed, even after every team is deleted.
const data = structuredClone(seed);
const graphql = jsonGraphqlServer(data);
data.trainers.splice(0, data.trainers.length, ...loaded.trainers);
data.teams.splice(0, data.teams.length, ...loaded.teams);
let saved = JSON.stringify(data);
function writeSnapshot(snapshot) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file + '.tmp', snapshot);
  renameSync(file + '.tmp', file);
}
if (!existsSync(file)) writeSnapshot(saved);
const app = express();
app.use(cors());
app.use((request, response, next) => {
  const end = response.end.bind(response);
  response.end = (...args) => {
    const snapshot = JSON.stringify(data);
    if (snapshot !== saved) {
      try {
        writeSnapshot(snapshot);
        saved = snapshot;
      } catch (error) {
        // Preserve resolver array references while rolling back an unwritable mutation.
        const previous = JSON.parse(saved);
        data.trainers.splice(0, data.trainers.length, ...previous.trainers);
        data.teams.splice(0, data.teams.length, ...previous.teams);
        console.error('Could not persist mock data:', error.message);
        if (response.headersSent) {
          response.destroy(error);
          return response;
        }
        response.removeHeader('Content-Length');
        response.statusCode = 500;
        response.setHeader('Content-Type', 'application/json');
        return end(
          JSON.stringify({ errors: [{ message: 'Team changes could not be written to disk.' }] }),
        );
      }
    }
    return end(...args);
  };
  next();
});
app.use('/', graphql);
app.listen(port, 'localhost', () =>
  console.log(`Persistent json-graphql-server: http://localhost:${port}/ (${file})`),
);
