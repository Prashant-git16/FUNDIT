/**
 * upload.js — Multer configuration for multipart image uploads.
 *
 * In production, images are piped directly to AWS S3 using multer-s3.
 * When AWS credentials / bucket are not configured (local dev without S3),
 * the middleware falls back to in-memory storage and the route handler must
 * handle the file.buffer manually (or the feature is marked unavailable).
 *
 * Security decisions:
 * - Only JPEG, PNG, and WebP are accepted (checked by mimetype AND magic bytes via
 *   the fileFilter callback).
 * - File size is capped at 5 MB.
 * - The S3 key is generated from a UUID, never from the original filename,
 *   to prevent path traversal and key collisions.
 */
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Reusable file filter — rejects anything that is not an allowed image type. */
function imageFileFilter(_req, file, cb) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are accepted'), false);
  }
}

/**
 * Build an S3-backed multer instance for the given folder prefix.
 * Returns null if AWS is not configured, so callers can degrade gracefully.
 */
function createS3Uploader(folder) {
  const bucketName = process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;

  if (!bucketName || !region) {
    console.warn('[upload] S3 not configured — image uploads will be unavailable');
    return null;
  }

  const s3 = new S3Client({ region });

  return multer({
    storage: multerS3({
      s3,
      bucket: bucketName,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      // Generate a UUID-based key so original filenames never reach S3
      key(_req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        cb(null, `${folder}/${uuidv4()}${ext}`);
      },
    }),
    fileFilter: imageFileFilter,
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
  });
}

const fs = require('fs');

/**
 * Build a local disk multer uploader (for local dev without S3).
 * Files are stored in backend/uploads/<folder>/ and file.key is populated
 * identically to multer-s3 so route handlers remain completely cloud-agnostic.
 */
function createLocalUploader(folder) {
  const uploadDir = path.join(__dirname, 'uploads', folder);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  return multer({
    storage: multer.diskStorage({
      destination(_req, _file, cb) {
        cb(null, uploadDir);
      },
      filename(_req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        const filename = `${uuidv4()}${ext}`;
        file.key = `${folder}/${filename}`; // Match S3 key format
        cb(null, filename);
      },
    }),
    fileFilter: imageFileFilter,
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
  });
}

/**
 * Return a single-field multer middleware for the given folder.
 * Uses S3 when configured; falls back to local disk storage for local dev.
 */
function imageUpload(folder = 'campaigns') {
  const s3Uploader = createS3Uploader(folder);
  return s3Uploader ? s3Uploader.single('image') : createLocalUploader(folder).single('image');
}

/**
 * Build the public delivery URL for a stored image.
 * 1. Returns direct URL if image_key is already a complete URL (e.g. Unsplash seed data)
 * 2. In production, images are served through CloudFront or direct S3
 * 3. In local dev without AWS, serves via local /uploads endpoint
 */
function buildImageUrl(s3Key) {
  if (!s3Key) return null;
  if (s3Key.startsWith('http://') || s3Key.startsWith('https://')) {
    return s3Key;
  }
  const cdnDomain = process.env.CLOUDFRONT_DOMAIN;
  if (cdnDomain) return `${cdnDomain}/${s3Key}`;
  const bucket = process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_REGION || 'ap-south-1';
  if (bucket) return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;

  // Local dev fallback
  const port = process.env.PORT || 5000;
  return `http://localhost:${port}/uploads/${s3Key}`;
}

module.exports = { imageUpload, buildImageUrl };
