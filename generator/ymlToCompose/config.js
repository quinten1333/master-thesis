export default {
  gateway: {
    compose: {
      build: {
        context: 'blocks/gateway',
        args: { NODE_ENV: 'dvelopment' }
      },
      entrypoint: 'npm run dev',
      volumes: [
        './blocks/gateway/:/app',
        './libs:/libs'
      ],
      environment: {
        DEBUG: 'gateway:*,messaging'
      }
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
      build: {
        context: 'blocks/plus',
        args: { NODE_ENV: 'dvelopment' }
      },
      entrypoint: 'npm run dev',
      volumes: [
        './blocks/plus/:/app',
        './libs:/libs'
      ]
    }
  },
  min: {
    compose: {
      build: {
        context: 'blocks/min',
        args: { NODE_ENV: 'dvelopment' }
      },
      entrypoint: 'npm run dev',
      volumes: [
        './blocks/min/:/app',
        './libs:/libs'
      ]
    }
  },
}
