import yaml from 'js-yaml';
import fs from 'fs/promises'

import { genAPI } from '../blocks/architectureManager/frontend/src/api.js';

const genEnvConfig = (arch) => {
  const res = {};
  for (const env in arch.environments) {
    if (Object.keys(arch.environments[env].pipelines).length === 0) continue;

    res[env] = {
      name: arch.name,
      id: arch.id,
      ...arch.environments[env],
    };
  }

  return res;
}

const actions = {
  'push': async () => {
    const file = process.argv[3];
    const arch = yaml.load(await fs.readFile(file));
    const perEnv = genEnvConfig(arch);

    for (const envName in perEnv) {
      const env = perEnv[envName];

      const api = genAPI(env.managementEndpoint);
      const id = await api.architecture.create(yaml.dump(env));
      await api.architecture.setActive(id, true);
    }
  },
  'list': async () => {
    const url = process.argv[3];

    const api = genAPI(url);
    const res = await api.architecture.getAll();
    console.log(res);
  },
  'clear': async () => {
    const url = process.argv[3];

    const api = genAPI(url);
    const res = await api.architecture.getAll();
    for (const id in res) {
      await api.architecture.setActive(id, false);
    }
  },
}

const cli = async () => {
  if (process.argv.length < 3) {
    console.error('This program requires one parameter the action.');
    process.exit(1);
  }

  const action = process.argv[2];
  if (!(action in actions)) {
    console.error('Unknown action');
    return 1;
  }

  await actions[action]();
};

cli().then((statusCode) => {
  process.exitCode = statusCode;
});
