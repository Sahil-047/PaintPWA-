import amqp from 'amqplib';
import config from '../../config';

let channel: amqp.Channel | null = null;

const setupRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(config.rabbitmqConfig.url);
    channel = await connection.createChannel();

    const exchange = config.rabbitmqConfig.exchange;
    await channel.assertExchange(exchange, 'direct', { durable: true });

    const queues = [
      config.rabbitmqConfig.queues.billPdf,
      config.rabbitmqConfig.queues.cashMemoPdf,
    ];

    for (const queue of queues) {
      if (!queue) continue;
      await channel.assertQueue(queue, { durable: true });
      await channel.bindQueue(queue, exchange, queue);
    }

    console.log('✅ RabbitMQ connected successfully');
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error);
    process.exit(1);
  }
};

const getRabbitMQChannel = async () => {
  if (!channel) {
    const connection = await amqp.connect(config.rabbitmqConfig.url);
    channel = await connection.createChannel();
  }
  return channel;
};

export { setupRabbitMQ, getRabbitMQChannel };
