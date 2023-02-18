export default class Architecture {
  constructor(conn, id, name, datasets, pipelines, endpoint) {
    this.conn = conn;

    this.id = id;
    this.name = name;
    this.datasets = datasets;
    this.pipelines = pipelines;
    this.endpoint = endpoint;

    this.IOConfig = this.generateIOConfig();
  }

  namespace(pipeId, str) {
    return `arch-${this.id}-${pipeId}-${str}`
  }

  generateIOConfig = () => {
    const result = {};

    for (const pipeId in this.pipelines) {
      const steps = this.pipelines[pipeId].steps;

      for (let step in steps) {
        step = parseInt(step);
        const stepConfig = steps[step];

        if (!stepConfig.block) {
          throw new Error(`Required parameter block missing on step ${step}!`);
        }

        if (!(stepConfig.block in result)) {
          result[stepConfig.block] = {
            endpoint: this.endpoint,
            pipelines: {}
          }
        }

        const blockConfig = result[stepConfig.block];
        if (!blockConfig.pipelines[pipeId]) {
          blockConfig.pipelines[pipeId] = {
            queues: {},
          };
        }
        const pipeConfig = blockConfig.pipelines[pipeId];

        const namespacedQueue = this.namespace(pipeId, stepConfig.block);
        if (!pipeConfig.queues[namespacedQueue]) {
          pipeConfig.queues[namespacedQueue] = {
            steps: {},
          };
        }

        pipeConfig.queues[namespacedQueue].steps[step] = {
          ...stepConfig,
          extraArgs: stepConfig.extraArgs || [],
          ...(steps.length - 1 !== step ? {
            outQueue: this.namespace(pipeId, steps[step + 1].block)
          } : {}),
        }
      }
    }
    return result;
  }

  async create() {
    if (this.active) {
      throw new Error('Architecture is already active!');
    }
    // TODO: Check if service is running

    for (const service in this.IOConfig) {
      try {
        await this.conn.publish(`arch-management-${service}`, { command: 'create', payload: { archID: this.id, archIO: this.IOConfig[service] }})
      } catch (error) {
        if (error.code !== 404) { throw error; }

        await new Promise((resolve) => setTimeout(resolve, 500));
        await this.delete(true);
        throw new Error(`Service ${service} not running. Architecture cannot be enabled!`);
      }
    }

    this.active = true;
  }

  async delete(ignoreErrors=false) {
    for (const service in this.IOConfig) {
      try {
        await this.conn.publish(`arch-management-${service}`, { command: 'delete', payload: { archID: this.id } })
      } catch (error) {
        if (ignoreErrors) { continue; }

        throw error;
      }
    }

    this.active = false;
  }
}
