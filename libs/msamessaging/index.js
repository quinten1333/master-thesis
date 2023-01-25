/**
 * Imported by user and registers possible functions, their name and their signature.
 *
 * Read structure from env variables and handles the IO.
 * User can call start function which starts the listening and IO.
 * User can call the run function as entry point of running computations on the MSA.
 */

import AMQPConn from "./messaging.js";
import debugLib from 'debug';

const debug = debugLib('messaging');

export default class MSAMessaging {
  constructor() {
    this.started = false;
    this.config = null;
    this.conn = null;

    this.functions = {};
    this.arches = {};
  }

  register(name, fn) {
    if (this.started) {
      throw new Error('Cannot register a function after messaging has started');
    }
    if (typeof fn !== 'function') {
      throw new Error('Given callback is not a function, received: ' + fn);
    }

    this.functions[name] = fn;
  }

  readConfig(config) {
    this.config = config || JSON.parse(process.env.IOConfig);

    if (!this.config.archEndpoint) {
      throw new Error('No archEndpoint specified in the config');
    }
    if (!this.config.archExchange) {
      throw new Error('No archExchange specified in the config');
    }
  }

  commands = {
    create: ({ archID, archIO }) => {
      if (archID in this.arches) {
        console.warn(`Architecture with ID ${archID} already exists.`);
        return;
      }

      this.arches[archID] = new MSAArchitecture(archIO, this.functions);
      this.arches[archID].start();
    },
    delete: ({ archID }) => {
      if (!(archID in this.arches)) {
        return;
      }

      this.arches[archID].stop();
      delete this.arches[archID];
    }
  }

  async start() {
    if (!this.config) {
      this.readConfig();
    }

    if (this.started) {
      throw new Error('You cannot start IO twice!');
    }
    this.started = true;

    this.conn = new AMQPConn(this.config.archEndpoint);
    await this.conn.connect();
    this.conn.subscribe(this.config.archExchange, (data) => {
      debug('Received %s command from management', data);
      if (this.commands[data.command]) {
        this.commands[data.command](data.payload);
      } else {
        console.warn('Skipping unkown management command: ' + data.command);
      }
    });
  }
}

class MSAArchitecture {
  constructor(archIO, functions) {
    this.archIO = archIO;
    this.functions = functions;

    this.started = false;
    this.conn = null;
    this.reqIdCounter = 0;

    // Contains the config of step '0' if present.
    this.initialStep = null;
    this.validateIO(this.archIO);
  }

  validateIO(archIO) {
    if (!archIO.endpoint) {
      throw new Error(`Endpoint of architecture missing!`);
    }

    for (const queue in archIO.queues) {
      const queueConfig = archIO.queues[queue];

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
          throw new Error(`Required extraArgs parameter is not an array.`)
        }
      }
    }
  }

  handleError(data, err) {
    // TODO: Send error to original gateway to be returned to the user.
    // Move to job based invocation?
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
      debug('Executing function %s with input %s', stepConfig.fnName, data.input);
      try {
        output = this.functions[stepConfig.fnName]({...data, arch: this }, ...stepConfig.extraArgs);
      } catch (err) {
        this.handleError(data, err);
        return;
      }

      if (typeof stepConfig.outQueue !== 'undefined') {
        debug('Sending result to %s',stepConfig.outQueue);
        this.conn.send(stepConfig.outQueue, { ...data, step: data.step + 1, input: output });
      }
    }
  }

  start = async () => {
    if (this.started) {
      throw new Error('You cannot start an architecture twice!');
    }
    this.started = true;

    this.conn = new AMQPConn(this.archIO.endpoint); // TODO: One connection per node instead of per arch
    await this.conn.connect();

    for (const queue in this.archIO.queues) {
      const queueConfig = this.archIO.queues[queue];
      this.conn.receive(queue, this.genReceive(queueConfig));
    }


    if (this.initialStep) {
      this.functions[this.initialStep.fnName]({ arch: this, start: true }, ...this.initialStep.extraArgs);
    }
  }

  stop = async () => {
    await this.conn.disconnect();
    this.conn = null;
    this.started = false;

    if (this.initialStep) {
      this.functions[this.initialStep.fnName]({ arch: this, start: false }, ...this.initialStep.extraArgs);
    }
  }

  run = (input, metadata = {}) => {
    if (!this.initialStep) {
      throw new Error('ArchIO does not have a step 0 so this node is not configured to be the entrypoint');
    }

    const reqId = ++this.reqIdCounter;
    this.conn.send(this.initialStep.outQueue, { ...metadata, reqId, step: 1, input });

    return reqId;
  }
}
