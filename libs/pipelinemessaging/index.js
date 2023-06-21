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

export default class Pipelinemessaging {
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

  getInput = (context, pre) => {
    if (!pre) {
      return context.data;
    }

    if (pre.pick) {
      if (pre.pick.key) {
        return context.get(pre.pick.key);
      } else {
        return pre.pick.value;
      }
    }

    const res = new Context({});
    for (const key of pre.select) {
      res.set(key.to, key.from ? context.get(key.from) : key.value)
    }

    return res.data;
  }

  getOutput = (output, context, post) => {
    if (!post) {
      return output;
    }

    if (post.set) {
      context.set(post.set, output);
    }

    if (post.initArray) {
      context.set(post.initArray, []);
    }

    if (output && post.upsert) {
      const outputObj = new Context(output);
      for (const key of post.upsert) {
        context.set(key.to, key.from ? outputObj.get(key.from) : key.value);
      }
    }

    if (context && post.unset) {
      for (const key of post.unset) {
        context.unset(key);
      }
    }

    return context.data;
  }

  getOutdata = (stepConfig, outContext) => {
    if (stepConfig.outCondition) {
      for (const condition of stepConfig.outCondition) {
        if (condition.fn(outContext)) {
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
      const context = new Context(data.context);
      const input = this.getInput(context, stepConfig.pre);
      debug('Executing function %s with input %s', stepConfig.fn, input);
      try {
        output = await this.functions[stepConfig.fn]({...data, context: undefined, input: input, pipeline: this }, ...stepConfig.extraArgs);
      } catch (err) {
        this.handleError(err, data, queueConfig, stepConfig);
        return;
      }

      const outData = this.getOutput(output, context, stepConfig.post);
      const [outQueue, outStep] = this.getOutdata(stepConfig, outData);
      if (outQueue) {
        debug('Sending result to %s', outQueue);
        this.conn.send(outQueue, { ...data, step: outStep, context: outData });
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
    const outContext = this.getOutput(input, {}, this.initialStep.post);
    const [outQueue, outStep] = this.getOutdata(this.initialStep, outContext);
    this.conn.send(outQueue, { ...metadata, reqId, step: outStep, context: outContext });

    return reqId;
  }
}

class Context {
  constructor(initialValue) {
    this.context = initialValue;
  }

  static getPattern(root, path, cb) {
    let cur = root;
    let key;
    path = [...path];
    while (path.length > 0) {
      key = path.shift();

      if (key.endsWith('[]')) {
        key = key.substring(0, key.length - 2);

        if (key) { cur = cur[key]; }
        for (const obj of cur) {
          Context.getPattern(obj, path, cb);
        }
        return; // Other invocations have finished the work recursivally.
      } else {
        if (!(key in cur)) {
          cur[key] = {};
        }

        cur = cur[key];
      }
    }

    // We are finished
    cb(cur);
  }

  resolve(key, cb) {
    const path = key.split('.');
    if (path.length === 1 && !path[0].endsWith('[]')) {
      return cb(this.context, path[0]);
    }

    const childKey = path.pop();
    Context.getPattern(this.context, path, (parent) => cb(parent, childKey));
  }

  get(key) {
    const res = [];
    this.resolve(key, (parent, childKey) => {
      res.push(parent[childKey]);
    });

    if (res.length === 1) {
      return res[0];
    }

    return res;
  }

  set(key, value) {
    const res = [];
    this.resolve(key, (parent, childKey) => {
      res.push([parent, childKey]);
    });

    if (res.length === 1) {
      const [parent, childKey] = res[0];
      parent[childKey] = value;
      return;
    }

    if (!Array.isArray(value) || (Array.isArray(value) && value.length <= 1)) {
      for (const [parent, childKey] of res) {
        parent[childKey] = value;
      }
      return;
    }

    if (res.length !== value.length) {
      throw new Error('Trying to merge arrays with different lengths!');
    }

    // Merge arrays
    for (const i in res) {
      // parent[child] = value
      res[i][0][res[i][1]] = value[i]
    }
  }

  unset(key) {
    this.resolve(key, (parent, childKey) => {
      delete parent[childKey];
    });
  }

  get data() {
    return this.context;
  }
}
