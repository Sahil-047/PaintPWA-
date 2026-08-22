import { ConsumeMessage } from 'amqplib';
import config from '../config';
import { getRabbitMQChannel } from '../lib/rabbitmq';
import { generateBillPdf } from '../util/helper/pdfGenerator';
import { uploadToS3 } from '../util/helper/uploadToS3';
import BillModel from '../model/billModel';
import { BillPdfMessage } from '../util/interface/pdfMessage.interface';
import logger from '../lib/winston/logger';

const handleBillPdfMessage = async (message: ConsumeMessage): Promise<void> => {
  const payload = JSON.parse(message.content.toString()) as BillPdfMessage;

  if (!payload.tenantId || !payload.billId || !payload.s3Key || !payload.pdfData) {
    throw new Error('Invalid bill PDF message payload');
  }

  const pdfBuffer = await generateBillPdf(payload.pdfData);

  await uploadToS3({
    buffer: pdfBuffer,
    key: payload.s3Key,
  });

  await BillModel.findOneAndUpdate(
    { _id: payload.billId, tenantId: payload.tenantId },
    { $set: { pdfUrl: payload.s3Key } },
    { new: true }
  );

  logger.info(`Bill PDF uploaded: ${payload.s3Key}`);
};

const startBillPdfConsumer = async (): Promise<void> => {
  const queue = config.rabbitmqConfig.queues.billPdf;
  if (!queue) {
    throw new Error('BILL_PDF_QUEUE is missing');
  }

  const channel = await getRabbitMQChannel();
  await channel.prefetch(1);

  await channel.consume(queue, async (message) => {
    if (!message) return;

    try {
      await handleBillPdfMessage(message);
      channel.ack(message);
    } catch (error) {
      logger.error('Error processing bill PDF message:', error);
      channel.nack(message, false, false);
    }
  });

  console.log(`Bill PDF consumer started on queue: ${queue}`);
};

export default startBillPdfConsumer;
