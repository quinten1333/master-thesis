export default {
  gateway: {
    compose: {
      image: 'ghcr.io/quinten1333/mt-blocks:gateway'
    },
    dynamicCompose: (IOConfig) => {
      const compose = {};

      const ports = new Set();
      for (const connection of IOConfig) {
        for (const queue in connection.queues) {
          const queueConfig = connection.queues[queue];
          for (const step in queueConfig.steps) {
            const stepConfig = queueConfig.steps[step];

            if (stepConfig.fnName === 'listen') {
              ports.add(stepConfig.extraArgs[0].port);
            }
          }
        }
      }

      compose.ports = Array.from(ports).map((port) => `${port}:${port}`);
      return compose;
    }
  },
  plus: {
    compose: {
      image: 'ghcr.io/quinten1333/mt-blocks:plus'
    }
  },
  min: {
    compose: {
      image: 'ghcr.io/quinten1333/mt-blocks:min'
    }
  },
  mul: {
    compose: {
      image: 'ghcr.io/quinten1333/mt-blocks:mul'
    }
  },
  div: {
    compose: {
      image: 'ghcr.io/quinten1333/mt-blocks:div'
    }
  },
  mod: {
    compose: {
      image: 'ghcr.io/quinten1333/mt-blocks:mod'
    }
  },
}
