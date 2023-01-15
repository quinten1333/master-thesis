import amqp from 'amqplib';
import debugLib from 'debug';
import config from './config.js';

const debug = debugLib('messaging');

export default class AMQPConn {
  constructor(endpoint) {
    this.endpoint = endpoint;

    this.conn = null;
    this.channel = null;

    this.replyQueue = null;
    this.sendInitialized = false;

    this.correlationId = 0;
    this.correlationIds = {};
  }

  connect = async () => {
    let tries = 0;
    while (true) {
      try {
        this.conn = await amqp.connect(this.endpoint);
        break;
      } catch (error) {
        if (tries > config.messaging.retry_count) {
          throw error;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      tries += 1;
    }
    this.channel = await this.conn.createChannel();
    this.channel.prefetch(5);
    debug('Connected to amqp');

    process.once('SIGINT', this.disconnect); // Automatic gracefull disconnect
  }

  disconnect = async () => {
    debug('Disconnecting from amqp');
    await this.conn.close();
    this.conn = null;
    this.channel = null;
    this.replyQueue = null;
    this.sendInitialized = false;
  }


  //* Receiving
  receive = async (queue, callback) => {
    this.channel.assertQueue(queue, {
      durable: false,
    });

    this.channel.consume(queue, async (msg) => {
      debug('Recv corr: %ds, replyTo: %s data: %s', msg.properties.correlationId, msg.properties.replyTo, msg.content.toString())
      if (config.messaging.msg_timeout && msg.properties.timestamp < Date.now() - config.messaging.msg_timeout) {
        this.channel.ack(msg);
        console.log('Dropped timeouted message: ' + msg.content);
        return;
      }

      const payload = JSON.parse(msg.content.toString());
      const reply = await callback(payload);

      if (msg.properties.replyTo || reply !== undefined) {
        this.channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(reply)), { correlationId: msg.properties.correlationId, timestamp: Date.now() });
      }
      this.channel.ack(msg);
    });
  }

  //* Sending
  send = (queue, data) => {
    debug('Message no-reply send with data', data);
    this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), { timestamp: Date.now() });
  }

  /**
   * Allow sending possible by making an explusive reply queue and listening for
   * messages on it using the handleReply function.
   */
  initSending = async () => {
    // Initialize rpc mechanism
    this.replyQueue = await this.channel.assertQueue('', { exclusive: true });
    this.channel.consume(this.replyQueue.queue, this.handleReply, { noAck: true });
    debug('Initialized reply queue: %s', this.replyQueue.queue);
    this.sendInitialized = true;
  }

  /**
   * The function that handles the replies in the reply queue. It uses the
   * correlationId in the message to call the correct call back function set
   * by the RPC function.
   * @param {*} msg The message that has been received on the reply queue
  */
  handleReply = (msg) => {
    debug('Received message with correlationId: %d', msg.properties.correlationId);

    const callback = this.correlationIds[msg.properties.correlationId];
    if (callback) {
      delete this.correlationIds[msg.properties.correlationId];
      callback(msg);
    }
  }

  genCorrelationId = () => {
    return (++this.correlationId).toString();
  }

  /**
   * Does a remote procedure call with a reply on an extenal service.
   * The callback (promise resolve function) is set in the correlationsIds
   * dictionary. If a message is received in the reply queue with the same
   * correlationId as in the sent message the content of the message are parsed
   * and given to the callback which resolves the async function.
   * @param {String} queue The queue to send the rpc request to
   * @param {Object} data The data that should be sent.
   * @returns The response received via the reply queue
   */
  rpc = (queue, data) => {
    if (!sendInitialized) {
      throw new Error('Sending is not initialized when rpc is called!');
    }

    return new Promise((resolve, reject) => {
      const id = this.genCorrelationId();
      this.correlationIds[id] = (msg) => resolve(JSON.parse(msg.content.toString()));

      this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), { correlationId: id, replyTo: this.replyQueue.queue, timestamp: Date.now() });
      debug('Message send with corrolation id %d', id);
    });
  }
}
