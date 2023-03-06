export default class Architecture {
  constructor(conn, id, arch) {
    this.conn = conn;

    this.id = id;
    this.name = arch.name;
    this.datasets = arch.datasets || [];
    this.pipelines = arch.pipelines;
    this.endpoint = arch.endpoint;

    if (!arch.name) { throw new Error('Architecture requires a name property'); }
    if (!arch.pipelines) { throw new Error('Architecture requires a pipelines property'); }
    if (!arch.endpoint) { throw new Error('Architecture requires a endpoint property'); }

    this.IOConfig = this.generateIOConfig();
    this.state = 0
  }

  json() {
    return {
      name: this.name,
      datasets: this.datasets,
      pipelines: this.pipelines,
      endpoint: this.endpoint,
      state: this.state,
    }
  }

  namespace(pipeId, str) {
    return `arch-${this.id}-${pipeId}-${str}`
  }

  generateIOConfig = () => {
    const result = {};

    const genOutQueue = (pipeId, outStep) => this.namespace(pipeId, this.pipelines[pipeId].steps[outStep].block);

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
          ...(stepConfig.outCondition ? { outCondition: stepConfig.outCondition.map((condition) => {
            if (!condition['outStep']) { return condition; }
            condition.outQueue = genOutQueue(pipeId, condition['outStep']);
            return condition;
          }) } : {}),
          extraArgs: stepConfig.extraArgs || [],
          ...(stepConfig.outStep ? {
            outQueue: genOutQueue(pipeId, stepConfig.outStep),
          } : {}),
        }
      }
    }
    return result;
  }

  async create() {
    if (this.state !== 0) {
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

    this.state = 1;
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

    this.state = 0;
  }
}
