import startBillPdfConsumer from './billPdfConsumer';
import startCashMemoPdfConsumer from './cashMemoPdfConsumer';

const startPdfConsumers = async (): Promise<void> => {
  await Promise.all([startBillPdfConsumer(), startCashMemoPdfConsumer()]);
};

export default startPdfConsumers;
