import amqp from 'amqplib';
import debugLib from 'debug';
import config from './config.js';

const debug = debugLib('messaging');

export default class AMQPConn {
  endpoint: string
  conn: amqp.Connection
  channel: amqp.Channel
  confirmChannel: amqp.ConfirmChannel

  replyQueue: amqp.Replies.AssertQueue
  sendInitialized: boolean
  correlationId: number
  correlationIds: { [correlationId: number]: any }
  confirmChannelLastErr: any

  constructor(endpoint: string) {
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
    // this.channel.prefetch(5); // TODO What about prefetching
    this.channel.on('error', async (err) => {
      console.warn(`AMQP channel connected with ${this.endpoint} gave error: `, err);

      this.channel = await this.conn.createChannel();
    })
    debug('Connected to amqp');

    process.once('SIGINT', this.disconnect); // Automatic gracefull disconnect
  }

  disconnect = async () => {
    debug('Disconnecting from amqp');

    if (this.confirmChannel) await this.confirmChannel.close();
    if (this.channel) await this.channel.close();
    if (this.conn) await this.conn.close();
    this.conn = null;
    this.channel = null;
    this.confirmChannel = null;
    this.replyQueue = null;
    this.sendInitialized = false;
  }


  //* Receiving
  receive = async (queue: string, callback: (data: any) => any | undefined) => {
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

  /**
   * Subscribe to a fanout exchange.
   * @param {String} exchange The exchange to subscribe to
   * @param {Function} callback The function that should be called for every message
   */
  subscribe = async (exchange: string, callback: (content: any) => void) => {
    await this.channel.assertExchange(exchange, 'fanout');
    const subscribeQueue = await this.channel.assertQueue('', { exclusive: true });
    await this.channel.bindQueue(subscribeQueue.queue, exchange, '');
    this.channel.consume(subscribeQueue.queue, (msg) => callback(JSON.parse(msg.content.toString())), { noAck: true });
  }

  //* Sending
  send = (queue: string, data: any): void => {
    debug('Message no-reply send with data %s to %s', data, queue);
    this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), { timestamp: Date.now() });
  }

  publish = async (exchange: string, data: any): Promise<void> => {
    if (!this.confirmChannel) {
      this.confirmChannel = await this.conn.createConfirmChannel();
      this.confirmChannelLastErr = null;
      this.confirmChannel.once('error', (err) => { // Prevents whole application from crashing
        this.confirmChannelLastErr = err;
        this.confirmChannel = null;
      });
    }

    debug('Message published with data %s to %s', data, exchange);
    return new Promise(async (resolve, reject) => {
      this.confirmChannel.publish(exchange, '', Buffer.from(JSON.stringify(data)), { timestamp: Date.now() }, async (err, ok) => {
        if (err) {
          reject(this.confirmChannelLastErr || err);
          return;
        }

        resolve();
      });
    })
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
  handleReply = (msg: amqp.ConsumeMessage) => {
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
  rpc = (queue: string, data: any) => {
    if (!this.sendInitialized) {
      throw new Error('Sending is not initialized when rpc is called!');
    }

    return new Promise((resolve, reject) => {
      const id = this.genCorrelationId();
      this.correlationIds[id] = (msg: amqp.ConsumeMessage) => resolve(JSON.parse(msg.content.toString()));

      this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), { correlationId: id, replyTo: this.replyQueue.queue, timestamp: Date.now() });
      debug('Message send with corrolation id %d', id);
    });
  }
}
