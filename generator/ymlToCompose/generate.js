import yaml from 'js-yaml';
import fs from 'fs';

import config from './config.js';

const doc = yaml.load(fs.readFileSync(process.argv[2]));

const generateIOConfig = (doc) => {
  const result = {};

  for (let step in doc.steps) {
    step = parseInt(step);
    const stepConfig = doc.steps[step];

    if (!(stepConfig.block in result)) {
      result[stepConfig.block] = [{
        endpoint: doc.endpoint,
        queues: {
          [stepConfig.block]: {
            steps: {}
          }
        }
      }]
    }

    const blockConfig = result[stepConfig.block][0];
    blockConfig.queues[stepConfig.block].steps[step] = {
      fnName: stepConfig.fn,
      extraArgs: stepConfig.extraArgs || [],
      ...(doc.steps.length - 1 !== step ? {
        outId: 0,
        outQueue: doc.steps[step + 1].block
      } : {}),
    }
  }
  return result;
}

const generateDockerCompose = (doc, IOConfig) => {
  const compose = {
    version: '3',
    services: { ...doc.extraServices }
  };

  for (const service in IOConfig) {
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
