export default class Architecture {
  constructor(conn, id, name, steps, endpoint) {
    this.conn = conn;

    this.id = id;
    this.name = name;
    this.steps = steps;
    this.endpoint = endpoint;

    this.IOConfig = this.generateIOConfig();
  }

  namespace(str) {
    return `arch-${this.id}-${str}`
  }

  generateIOConfig = () => {
    const result = {};

    for (let step in this.steps) {
      step = parseInt(step);
      const stepConfig = this.steps[step];

      if (!stepConfig.block) {
        throw new Error(`Required parameter block missing on step ${step}!`);
      }

      if (!(stepConfig.block in result)) {
        result[stepConfig.block] = {
          endpoint: this.endpoint,
          queues: {}
        }
      }

      const blockConfig = result[stepConfig.block];
      const namespacedQueue = this.namespace(stepConfig.block);
      if (!blockConfig.queues[namespacedQueue]) {
        blockConfig.queues[namespacedQueue] = {
          steps: {},
        };
      }

      blockConfig.queues[namespacedQueue].steps[step] = {
        fnName: stepConfig.fn,
        extraArgs: stepConfig.extraArgs || [],
        ...(this.steps.length - 1 !== step ? {
          outQueue: this.namespace(this.steps[step + 1].block)
        } : {}),
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
