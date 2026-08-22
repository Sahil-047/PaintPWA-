function encodeUserInfo(value: string): string {
  return encodeURIComponent(value);
}

export function getRabbitMqUrl(): string {
  if (process.env.RABBITMQ_URL && !process.env.RABBITMQ_URL.includes('localhost')) {
    return process.env.RABBITMQ_URL;
  }

  const host = process.env.RABBITMQ_HOST || 'rabbitmq';
  const user = process.env.RABBITMQ_USER || 'paint';
  const password = process.env.RABBITMQ_PASSWORD || 'guest';
  return `amqp://${encodeUserInfo(user)}:${encodeUserInfo(password)}@${host}:5672`;
}

const rabbitmqConfig = {
  get url() {
    return getRabbitMqUrl();
  },
  exchange: process.env.RABBITMQ_EXCHANGE || 'paint.exchange',
  queues: {
    billPdf: process.env.BILL_PDF_QUEUE,
    cashMemoPdf: process.env.CASHMEMO_PDF_QUEUE,
  },
};

export default rabbitmqConfig;
