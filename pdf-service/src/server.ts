import 'dotenv/config';
import config from './config/index';
import express from 'express';
import router from './routes/index';
import connectToMongoDB from './lib/mongoose';
import { setupRabbitMQ } from './lib/rabbitmq';
import startPdfConsumers from './consumers/index';
import { loggerMiddleware } from './middleware/loggerMiddleware';
import { errorHandler } from './middleware/errorHandler';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: [config.commonConfig.paintFrontendBaseUrl].filter(Boolean) as string[],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.use(loggerMiddleware);

connectToMongoDB();
setupRabbitMQ().then(() => {
  startPdfConsumers().catch((error) => {
    console.error('Failed to start PDF consumers:', error);
    process.exit(1);
  });
});

app.use('/pdf', router);

app.use(errorHandler);

app.listen(config.commonConfig.port, () => {
  console.log(`Paint PDF service is running on port ${config.commonConfig.port}`);
});
