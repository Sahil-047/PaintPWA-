const rabbitmqConfig = {
  url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  exchange: process.env.RABBITMQ_EXCHANGE || 'paint.exchange',
  queues: {
    billPdf: process.env.BILL_PDF_QUEUE,
    cashMemoPdf: process.env.CASHMEMO_PDF_QUEUE,
  },
};

export default rabbitmqConfig;
