import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../../lib/aws/awsClient';
import config from '../../config';

const generateSignedUrl = async ({
  pdfKey,
  downloadFilename,
}: {
  pdfKey: string;
  downloadFilename?: string;
}): Promise<string> => {
  try {
    const command = new GetObjectCommand({
      Bucket: config.awsConfig.bucketName,
      Key: pdfKey,
      ...(downloadFilename
        ? {
            ResponseContentDisposition: `inline; filename="${String(downloadFilename).replace(/"/g, '')}"`,
            ResponseContentType: 'application/pdf',
          }
        : {}),
    });

    return await getSignedUrl(s3Client, command, { expiresIn: 60 * 120 });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error('Could not generate signed URL');
  }
};

export default generateSignedUrl;
