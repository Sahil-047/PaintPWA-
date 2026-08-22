import config from '../../config';
import { S3Client } from '@aws-sdk/client-s3';

export const s3Client = new S3Client({
  region: config.awsConfig.region,
  credentials: {
    accessKeyId: config.awsConfig.accessKeyId!,
    secretAccessKey: config.awsConfig.secretAccessKey!,
  },
});
