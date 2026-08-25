import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z
  .object({
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRE: z.string().default('7d'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPERADMIN_EMAIL: z.string().email().optional(),
  SUPERADMIN_PASSWORD: z.string().min(8).optional(),
  BOOTSTRAP_SECRET: z.string().min(8).optional(),
  // PDF storage: local disk or S3
  PDF_STORAGE: z.enum(['local', 's3']).default('local'),
  AWS_REGION: z.string().optional(),
  AWS_S3_PDF_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  // RabbitMQ — main API publishes; pdf-service consumes
  RABBITMQ_URL: z.string().optional(),
  RABBITMQ_EXCHANGE: z.string().default('paint.exchange'),
  BILL_PDF_QUEUE: z.string().default('paint.bill.pdf.queue'),
  CASHMEMO_PDF_QUEUE: z.string().default('paint.cashmemo.pdf.queue'),
  // Sync PDF render (pdf-service HTTP)
  PDF_SERVICE_URL: z
    .preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().url().optional()),
  PDF_SERVICE_SECRET: z.string().min(32).optional(),
})
  .refine(
    (data) => !data.PDF_SERVICE_URL || !!data.PDF_SERVICE_SECRET,
    { message: 'PDF_SERVICE_SECRET is required when PDF_SERVICE_URL is set', path: ['PDF_SERVICE_SECRET'] }
  );

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
