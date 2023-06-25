import AMQPConn from '@amicopo/pipelinemessaging/built/messaging.js';

const config = JSON.parse(process.env.IOConfig);
const conn = new AMQPConn(config.endpoint);

export default conn;
