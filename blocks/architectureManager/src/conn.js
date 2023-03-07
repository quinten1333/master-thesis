import AMQPConn from '@amicopo/msamessaging/messaging.js';

const config = JSON.parse(process.env.IOConfig);
const conn = new AMQPConn(config.endpoint);

export default conn;
