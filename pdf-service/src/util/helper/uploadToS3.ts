import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../../lib/aws/awsClient';
import config from '../../config';
import logger from '../../lib/winston/logger';

export const uploadToS3 = async ({
  buffer,
  key,
  contentType = 'application/pdf',
}: {
  buffer: Buffer;
  key: string;
  contentType?: string;
}) => {
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: config.awsConfig.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
  } catch (error) {
    logger.error('Error uploading to S3:', error);
    throw new Error('Failed to upload file to S3');
  }
};
