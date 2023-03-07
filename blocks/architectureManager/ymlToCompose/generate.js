import yaml from 'js-yaml';
import fs from 'fs';

import config from './config.js';

const doc = yaml.load(fs.readFileSync(process.argv[2]));

const generateDockerCompose = (doc, IOConfig) => {
  const compose = {
    version: '3',
    services: { ...doc.extraServices }
  };

  for (const service in IOConfig) {
    if (!config[service]) {
      throw new Error(`Service ${service} is not configured!`);
    }

    const dynamicCompose = config[service].dynamicCompose;
    const dynamicConfigRes = dynamicCompose ? dynamicCompose(IOConfig[service]) : {};

    compose.services[service] = { // TODO: Make merging better by concatting arrays and extending dictionaries with same name
      ...config[service].compose,
      ...dynamicConfigRes,
      environment: {
        ...(config[service].compose.environment || {}),
        ...(dynamicConfigRes.environment || {}),
        IOConfig: JSON.stringify(IOConfig[service]),
      }
    }
  }

  return compose;
}

const IOConfig = generateIOConfig(doc);
fs.writeFileSync(`${doc.name}.json`, JSON.stringify(IOConfig, undefined, 2));

const dockerCompose = generateDockerCompose(doc, IOConfig);
fs.writeFileSync(`${doc.name}.yaml`, yaml.dump(dockerCompose));
