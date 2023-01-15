/**
 * Imported by user and registers possible functions, their name and their signature.
 *
 * Read structure from env variables and handles the IO.
 * User can call start function which starts the listening and IO.
 * User can call the run function as entry point of running computations on the MSA.
 */

import AMQPConn from "./messaging.js";

export default class MSAMessaging {
  constructor() {
    this.started = false;

    this.functions = {};
    this.connections = [];

    this.reqIdCounter = 0;

    // Contains the config of step '0' if present.
    this.initialStep = null;
  }

  register(name, fn) {
    if (typeof fn !== 'function') {
      throw new Error('Given callback is not a function, received: ' + fn);
    }

    this.functions[name] = fn;
  }

  readConfig(config) {
    this.config = config || JSON.parse(process.env.IOConfig);

    for (const connection of this.config) {
      if (!connection.endpoint) {
        throw new Error(`Endpoint of connection index ${this.config.indexOf(connection)} missing!`);
      }

      for (const queue in connection.queues) {
        const queueConfig = connection.queues[queue];

        for (const step in queueConfig.steps) {
          const stepConfig = queueConfig.steps[step];
          if (step === '0') {
            this.initialStep = stepConfig;

            if (typeof stepConfig.outQueue === 'undefined') {
              throw new Error('Initial step does not have an output!');
            }
          }

          if (!this.functions[stepConfig.fnName]) {
            throw new Error(`Function ${stepConfig.fnName} used in config but is not registered!`);
          }
          if (!Array.isArray(stepConfig.extraArgs)) {
            throw new Error(`Required extraArgs parameter is not an array in step ${step}.`)
          }
          if ((typeof stepConfig.outId === 'undefined') !== (typeof stepConfig.outQueue === 'undefined')) {
            throw new Error(`Either outId or outQueue is set while the other variable is not of step ${step}!`);
          }
        }
      }
    }
  }

  handleError(data, err) {
    // TODO: Send error to original gateway to be returned to the user.
    console.error(err);
  }

  genReceive(queueConfig) {
    return (data) => {
      const stepConfig = queueConfig.steps[data.step];
      if (!stepConfig) {
        console.error(`Received unconfigured step "${data.step}"`);
        return;
      }

      let output;
      try {
        output = this.functions[stepConfig.fnName](data.input, data, ...stepConfig.extraArgs);
      } catch (err) {
        this.handleError(data, err);
        return;
      }

      if (typeof stepConfig.outId !== 'undefined') {
        this.connections[stepConfig.outId].send(stepConfig.outQueue, {...data, step: data.step + 1, input: output});
      }
    }
  }

  start = async (config = null) => {
    if (this.started) {
      throw new Error('You cannot start IO twice!');
    }
    this.started = true;

    this.readConfig(config);

    for (const connection of this.config) {
      const conn = new AMQPConn(connection.endpoint);
      await conn.connect();

      for (const queue in connection.queues) {
        const queueConfig = connection.queues[queue];
        conn.receive(queue, this.genReceive(queueConfig));
      }

      this.connections.push(conn);
    }

    if (this.initialStep) {
      this.functions[this.initialStep.fnName](null, null, ...this.initialStep.extraArgs);
    }
  }

  run = (input, metadata={}) => {
    if (!this.initialStep) {
      throw new Error('IOConfig does not have a step 0 so this node is not configured to be the entrypoint');
    }

    const reqId = ++this.reqIdCounter;
    this.connections[this.initialStep.outId].send(this.initialStep.outQueue, { ...metadata, reqId, step: 1, input });

    return reqId;
  }
}
