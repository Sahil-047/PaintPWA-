function encodeUserInfo(value: string): string {
  return encodeURIComponent(value);
}

export function getRabbitMqUrl(): string | undefined {
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

  return url;
}
