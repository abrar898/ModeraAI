import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

// S3_ENABLED is a function (not a constant) so it reads process.env at
// call-time, after dotenv has loaded — same fix as moderationService.
export function S3_ENABLED() {
  return !!(
    process.env.S3_BUCKET &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );
}

let _s3Client = null;

function getS3Client() {
  if (_s3Client) return _s3Client;
  _s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    // S3_ENDPOINT enables Cloudflare R2, MinIO, or any S3-compatible provider
    ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    // Cloudflare R2 requires path-style addressing
    forcePathStyle: !!process.env.S3_ENDPOINT,
  });
  return _s3Client;
}

/**
 * Upload a buffer to S3. Returns the object key (never a URL — URLs are
 * generated on-demand as pre-signed so they are always short-lived).
 */
export async function uploadImage(buffer, mimetype, originalName) {
  if (!S3_ENABLED()) return null;

  const ext = (originalName.split('.').pop() || 'jpg').toLowerCase();
  const key = `submissions/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      // Objects are private — access only via pre-signed URLs
    })
  );

  return key;
}

/**
 * Generate a time-limited pre-signed GET URL for an object key.
 * Default expiry: 1 hour. The URL is signed by AWS/R2 — no user credential
 * is embedded in it.
 */
export async function getImageUrl(key, expiresInSeconds = 3600) {
  if (!S3_ENABLED() || !key) return null;

  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
    { expiresIn: expiresInSeconds }
  );
}

/**
 * Delete an object from S3. Called on partial submission failure to avoid
 * leaving orphaned objects in the bucket.
 */
export async function deleteImage(key) {
  if (!S3_ENABLED() || !key) return;
  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key })
  );
}
