import { MongoClient } from 'mongodb'
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import axios from 'axios';
const execFilePromise = promisify(execFile);

async function provision(uri) {
  console.log('Provisioning', uri)
  const client = new MongoClient(uri);
  await client.connect();

  const db = client.db('expenses');
  const col = db.collection('expenses');
  await col.deleteMany({});

  const count = Math.round(Math.random() * 100);

  const entries = [];
  for (let i = 0; i < count; i++) {
    entries.push({
      i: i,
      amount: Math.round(Math.random() * 100000) / 100
    });
  }

  await col.insertMany(entries);

  await client.close();

  console.log('Finished provisioning', uri);
  return entries;
}

async function main() {
  const collections = await Promise.all([
    provision('mongodb://expenses-central'), // Central
    provision('mongodb://expenses-surf'), // surf
    provision('mongodb://expenses-uva') // UvA
  ]);
  const amounts = {
    'central': collections[0].map((doc) => doc.amount),
    'surf': collections[1].map((doc) => doc.amount),
    'uva': collections[2].map((doc) => doc.amount),
  };
  const correctResult = {
    'central': {
      sum: amounts['central'].reduce((sum, amount) => sum + amount, 0),
      avg: amounts['central'].reduce((sum, amount) => sum + amount, 0) / amounts['central'].length,
    },
    'surf': {
      sum: amounts['surf'].reduce((sum, amount) => sum + amount, 0),
      avg: amounts['surf'].reduce((sum, amount) => sum + amount, 0) / amounts['surf'].length,
    },
    'uva': {
      sum: amounts['uva'].reduce((sum, amount) => sum + amount, 0),
      avg: amounts['uva'].reduce((sum, amount) => sum + amount, 0) / amounts['uva'].length,
    },
  }

  // Deploy architecture
  console.log('Compiling')
  await execFilePromise('python', ['../../../blocks/userStoryCompiler/src/run.py', '../multi-env.yml'])
  console.log('Deploying')
  await Promise.all([
    'https://central.thesis.dev.qrcsoftware.nl',
    'https://uva.thesis.dev.qrcsoftware.nl',
    'https://surf.thesis.dev.qrcsoftware.nl'
  ].map((url) => execFilePromise('node', ['../../../cli/cli.js', 'clear', url])));
  await execFilePromise('node', ['../../../cli/cli.js', 'push', './compiled.yml']);
  console.log('Deployed')

  // Get result
  const res = (await axios.get('https://gateway.central.thesis.dev.qrcsoftware.nl/get')).data;
  console.log('Results:');
  console.log(res);

  // Validate results
  console.log('Correct results:');
  console.log(correctResult);
}

main();
