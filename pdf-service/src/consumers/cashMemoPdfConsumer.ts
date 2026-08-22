import { ConsumeMessage } from 'amqplib';
import config from '../config';
import { getRabbitMQChannel } from '../lib/rabbitmq';
import { generateCashMemoPdf } from '../util/helper/pdfGenerator';
import { uploadToS3 } from '../util/helper/uploadToS3';
import CashMemoModel from '../model/cashMemoModel';
import { CashMemoPdfMessage } from '../util/interface/pdfMessage.interface';
import logger from '../lib/winston/logger';

const handleCashMemoPdfMessage = async (message: ConsumeMessage): Promise<void> => {
  const payload = JSON.parse(message.content.toString()) as CashMemoPdfMessage;

  if (!payload.tenantId || !payload.memoId || !payload.s3Key || !payload.pdfData) {
    throw new Error('Invalid cash memo PDF message payload');
  }

  const pdfBuffer = await generateCashMemoPdf(payload.pdfData);

  await uploadToS3({
    buffer: pdfBuffer,
    key: payload.s3Key,
  });

  await CashMemoModel.findOneAndUpdate(
    { _id: payload.memoId, tenantId: payload.tenantId },
    { $set: { pdfUrl: payload.s3Key } },
    { new: true }
  );

  logger.info(`Cash memo PDF uploaded: ${payload.s3Key}`);
};

const startCashMemoPdfConsumer = async (): Promise<void> => {
  const queue = config.rabbitmqConfig.queues.cashMemoPdf;
  if (!queue) {
    throw new Error('CASHMEMO_PDF_QUEUE is missing');
  }

  const channel = await getRabbitMQChannel();
  await channel.prefetch(1);

  await channel.consume(queue, async (message) => {
    if (!message) return;

    try {
      await handleCashMemoPdfMessage(message);
      channel.ack(message);
    } catch (error) {
      logger.error('Error processing cash memo PDF message:', error);
      channel.nack(message, false, false);
    }
  });

  console.log(`Cash memo PDF consumer started on queue: ${queue}`);
};

export default startCashMemoPdfConsumer;
