import yaml from 'js-yaml';
import fs from 'fs/promises'

import { genAPI } from '../blocks/architectureManager/frontend/src/api.js';

const genEnvConfig = (arch) => {
  const res = {};
  for (const env in arch.environments) {
    res[env] = {
      name: arch.name,
      ...arch.environments[env],
    };
  }

  return res;
}


const cli = async () => {
  if (process.argv.length !== 3) {
    console.error('This program only accepts one parameter, the name of the compiled yaml file');
    process.exit(1);
  }

  const file = process.argv[2];
  const arch = yaml.load(await fs.readFile(file));
  const perEnv = genEnvConfig(arch);

  for (const envName in perEnv) {
    const env = perEnv[envName];

    const api = genAPI(env.managementEndpoint);
    const id = await api.architecture.create(yaml.dump(env));
    await api.architecture.setActive(id, true);
  }
};

cli();
