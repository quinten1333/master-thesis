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

/**
 * Merges the supplied objects on the first depth level.
 * @param {Object} input The dynamic input
 * @param {Object} args The static input which may be overwritten
 * @returns Merged object
 */
export function mergeOptions(input, args) {
  const res = {...args};
  for (const key in input) {
    res[key] = input[key];
  }

  return res;
}

/**
 * Remove all undefined keys from the dictionary.
 * @param {Object} originalDict The dictionary that will be cleaned
 * @returns A dict withoud any keys which have the value undefined
 */
export function cleanDict(originalDict) {
  const dict = {...originalDict};

  for (const key in originalDict) {
    if (dict[key] === undefined) {
      delete dict[key];
    }
  }

  return dict;
}

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
    this.validateIO();

    this.started = false;
    this.conn = null;

    this.pipelines = [];
  }

  validateIO() {
    if (!this.archIO.endpoint) {
      throw new Error(`Endpoint of architecture missing!`);
    }

    if (!this.archIO.pipelines) {
      throw new Error('Pipelines of architecture missing!');
    }
  }

  start = async () => {
    if (this.started) {
      throw new Error('You cannot start an architecture twice!');
    }
    this.started = true;

    this.conn = new AMQPConn(this.archIO.endpoint);
    await this.conn.connect();

    for (const pipeId in this.archIO.pipelines) {
      const pipeline = new MSAPipeline(this.archIO.pipelines[pipeId], this.functions, this.conn);
      await pipeline.start();
      this.pipelines.push(pipeline);
    }
  }

  stop = async () => {
    for (const pipeline of this.pipelines) {
      await pipeline.stop();
    }

    await this.conn.disconnect();
    this.conn = null;
    this.started = false;
  }
}

class MSAPipeline {
  constructor(pipeIO, functions, conn) {
    this.pipeIO = pipeIO;
    this.functions = functions;
    this.conn = conn;

    this.started = false;
    this.reqIdCounter = 0;

    // Contains the config of step '0' if present.
    this.initialQueue = null;
    this.validateIO();
  }

  get initialStep() { return this.initialQueue ? this.initialQueue.steps[0] : null }

  validateIO() {
    for (const queue in this.pipeIO.queues) {
      const queueConfig = this.pipeIO.queues[queue];

      for (const step in queueConfig.steps) {
        const stepConfig = queueConfig.steps[step];
        if (step === '0') {
          this.initialQueue = queueConfig;

          if (typeof stepConfig.outQueue === 'undefined') {
            throw new Error('Initial step does not have an output!');
          }
        }

        if (!this.functions[stepConfig.fn]) {
          throw new Error(`Function ${stepConfig.fn} used in config but is not registered!`);
        }
        if (!Array.isArray(stepConfig.extraArgs)) {
          throw new Error(`Required extraArgs parameter is not an array.`)
        }
        if (!!stepConfig.outStep !== !!stepConfig.outQueue) {
          throw new Error(`Output of config if partially configured: outStep=${stepConfig.outStep} outQueue=${stepConfig.outQueue}`);
        }

        if (stepConfig.outCondition) {
          for (const condition of stepConfig.outCondition) {
            if (!condition.fn) {
              throw new Error(`Condition function is not set. Got condition: ${condition}`);
            }

            condition.fn = eval(condition.fn); //! Insecure
            if (typeof condition.fn !== 'function') {
              throw new Error(`Condition function is not actually of type function! Got type ${typeof condition.fn}`);
            }
          }
        }

      }
    }
  }

  handleError(err, data, queueConfig, stepConfig) {
    // TODO: Add error mechanism for each pipeline. Default if using gateway is to return the error to the user.
    // Move to job based invocation?
    console.error(`Callback function "${stepConfig.fn}" failed`)
    console.error(err);
  }

  getInput = (state, pre) => {
    if (!pre) {
      return state;
    }

    if (pre.pick) {
      return state[pre.pick];
    }

    const res = {};
    for (const key of pre.select) {
      const split = key.to.split('.');
      let cur = res;

      for (let i = 0; i < split.length; i++) {
        if (i < split.length - 1) {
          if (!(split[0] in cur)) {
            cur[split[0]] = {};
          }

          cur = cur[split[0]];
        }
      }

      cur[split[split.length - 1]] = state[key.from];
    }

    return res;
  }

  getOutput = (output, state, post) => {
    if (!post) {
      return output;
    }

    if (post.set) {
      state[post.set] = output;
    }

    if (output && post.upsert) {
      for (const key of post.upsert) {
        state[key.to] = output[key.from]
      }
    }

    if (state && post.unset) {
      for (const key of post.unset) {
        delete state[key]
      }
    }

    return state;
  }

  getOutdata = (stepConfig, outState) => {
    if (stepConfig.outCondition) {
      for (const condition of stepConfig.outCondition) {
        if (condition.fn(outState)) {
          return [condition['outQueue'], condition['outStep']]
        }
      }
    }

    return [stepConfig.outQueue, stepConfig.outStep];
  }

  genReceive(queueConfig) {
    return async (data) => {
      const stepConfig = queueConfig.steps[data.step];
      if (!stepConfig) {
        console.error(`Received unconfigured step "${data.step}"`);
        return;
      }

      let output;
      const input = this.getInput(data.state, stepConfig.pre);
      debug('Executing function %s with input %s', stepConfig.fn, input);
      try {
        output = await this.functions[stepConfig.fn]({...data, state: undefined, input: input, pipeline: this }, ...stepConfig.extraArgs);
      } catch (err) {
        this.handleError(err, data, queueConfig, stepConfig);
        return;
      }

      const outState = this.getOutput(output, data.state, stepConfig.post);
      const [outQueue, outStep] = this.getOutdata(stepConfig, outState);
      if (outQueue) {
        debug('Sending result to %s', outQueue);
        this.conn.send(outQueue, { ...data, step: outStep, state: outState });
      }
    }
  }

  start = async () => {
    if (this.started) {
      throw new Error('You cannot start a pipeline twice!');
    }
    this.started = true;

    for (const queue in this.pipeIO.queues) {
      const queueConfig = this.pipeIO.queues[queue];
      this.conn.receive(queue, this.genReceive(queueConfig));
    }


    if (this.initialStep) {
      try {
        await this.functions[this.initialStep.fn]({ pipeline: this, start: true }, ...this.initialStep.extraArgs);
      } catch (err) {
        this.handleError(err, { start: true }, this.initialQueue, this.initialStep);
        return;
      }
    }
  }

  stop = async () => {
    this.started = false;

    if (this.initialStep) {
      try {
        await this.functions[this.initialStep.fn]({ pipeline: this, start: false }, ...this.initialStep.extraArgs);
      } catch (err) {
        this.handleError(err, { start: false }, this.initialQueue, this.initialStep);
        return;
      }
    }
  }

  run = (input, metadata = {}) => {
    if (!this.initialStep) {
      throw new Error('ArchIO does not have a step 0 so this node is not configured to be the entrypoint');
    }
    if (!this.started) {
      throw new Error('Architecture not started but tried to run it!')
    }

    const reqId = ++this.reqIdCounter;
    const state = this.getOutput(input, {}, this.initialStep.post);
    this.conn.send(this.initialStep.outQueue, { ...metadata, reqId, step: 1, state });

    return reqId;
  }
}
