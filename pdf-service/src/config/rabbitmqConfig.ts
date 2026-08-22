function encodeUserInfo(value: string): string {
  return encodeURIComponent(value);
}

export function getRabbitMqUrl(): string {
  const host = process.env.RABBITMQ_HOST;
  if (host) {
    const user = process.env.RABBITMQ_USER || 'paint';
    const password = process.env.RABBITMQ_PASSWORD || 'guest';
    return `amqp://${encodeUserInfo(user)}:${encodeUserInfo(password)}@${host}:5672`;
  }

  const url = process.env.RABBITMQ_URL;
  if (url && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    return url;
  }

  return 'amqp://localhost:5672';
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
