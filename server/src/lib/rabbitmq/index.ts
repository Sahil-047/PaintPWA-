import amqp from 'amqplib';
import { env } from '../../config/env.js';
import { getRabbitMqUrl } from '../../utils/rabbitmqUrl.js';

let channel: amqp.Channel | null = null;

const EXCHANGE = env.RABBITMQ_EXCHANGE ?? 'paint.exchange';

export async function setupRabbitMQPublisher(): Promise<void> {
  const rabbitmqUrl = getRabbitMqUrl();
  if (!rabbitmqUrl) {
    console.warn('RABBITMQ_URL not set — PDF jobs will run synchronously');
    return;
  }

  try {
    const connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE, 'direct', { durable: true });

    const queues = [env.BILL_PDF_QUEUE, env.CASHMEMO_PDF_QUEUE].filter(Boolean) as string[];
    for (const queue of queues) {
      await channel.assertQueue(queue, { durable: true });
      await channel.bindQueue(queue, EXCHANGE, queue);
    }

    console.log('✅ RabbitMQ publisher connected');
  } catch (error) {
    console.error('RabbitMQ publisher connection failed:', error);
    channel = null;
  }
}

export async function publishPdfJob(queue: string, payload: unknown): Promise<boolean> {
  const rabbitmqUrl = getRabbitMqUrl();
  if (!rabbitmqUrl || !queue) return false;

  if (!channel) {
    await setupRabbitMQPublisher();
  }
  if (!channel) return false;

  const body = Buffer.from(JSON.stringify(payload));
  return channel.publish(EXCHANGE, queue, body, {
    persistent: true,
    contentType: 'application/json',
  });
}
