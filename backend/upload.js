/**
 * upload.js — Resilient Multer configuration for file and image uploads.
 *
 * Supports AWS S3 when valid credentials and bucket are configured in .env.
 * Automatically and seamlessly falls back to local disk storage (backend/uploads/)
 * when AWS is not configured or if local development is active.
 *
 * Security decisions:
 * - Cover images: JPEG, PNG, WebP only (max 5 MB).
 * - Proof documents: JPEG, PNG, WebP, PDF (max 8 MB each, up to 3 files).
 * - S3 keys and local file names are generated from UUIDs to prevent path traversal.
 */
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_DOC_SIZE = 8 * 1024 * 1024;   // 8 MB

/**
 * Check whether AWS S3 can be used reliably.
 * Requires bucket, region, AND explicit credentials in .env (or IAM role in production).
 * This prevents the AWS SDK from picking up broken/stale system credentials.
 */
function canUseS3() {
  const bucket = process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  const hasKeys = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  const useIamRole = process.env.NODE_ENV === 'production' && process.env.AWS_USE_IAM_ROLE === 'true';

  return Boolean(bucket && region && (hasKeys || useIamRole));
}

/**
 * Build S3 Client with explicit credentials if provided.
 */
function getS3Client() {
  const region = process.env.AWS_REGION || 'us-east-1';
  const config = { region };

  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim(),
    };
  }

  return new S3Client(config);
}

/**
 * Build S3-backed storage engine.
 */
function createS3Storage(folder) {
  const s3 = getS3Client();
  const bucket = process.env.S3_BUCKET_NAME;

  return multerS3({
    s3,
    bucket,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key(_req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase() || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg');
      cb(null, `${folder}/${uuidv4()}${ext}`);
    },
  });
}

/**
 * Build local disk storage engine (always reliable fallback).
 */
function createLocalStorage(folder) {
  const uploadDir = path.join(__dirname, 'uploads', folder);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  return multer.diskStorage({
    destination(_req, _file, cb) {
      cb(null, uploadDir);
    },
    filename(_req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase() || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg');
      const filename = `${uuidv4()}${ext}`;
      file.key = `${folder}/${filename}`; // Match S3 key format for clean abstraction
      cb(null, filename);
    },
  });
}

/**
 * File filter for campaigns: accepts images for cover, and images/PDFs for proof documents.
 */
function campaignFileFilter(_req, file, cb) {
  if (file.fieldname === 'image') {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Campaign cover image must be a JPEG, PNG, or WebP file'));
    }
  } else if (file.fieldname === 'proofDocuments') {
    if (ALLOWED_DOC_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Proof documents must be JPEG, PNG, WebP, or PDF files'));
    }
  } else {
    cb(null, true);
  }
}

/**
 * Single-image uploader (for receipts, avatars, etc.)
 */
function imageUpload(folder = 'campaigns') {
  const storage = canUseS3() ? createS3Storage(folder) : createLocalStorage(folder);
  return multer({
    storage,
    fileFilter(req, file, cb) {
      if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPEG, PNG, and WebP images are accepted'), false);
      }
    },
    limits: { fileSize: MAX_IMAGE_SIZE },
  }).single('image');
}

/**
 * Multi-field uploader for campaign creation & editing:
 * - 'image': 1 main cover image
 * - 'proofDocuments': up to 3 proof documents/images (PDF, JPG, PNG)
 */
function campaignUpload() {
  const storage = canUseS3() ? createS3Storage('campaigns') : createLocalStorage('campaigns');
  return multer({
    storage,
    fileFilter: campaignFileFilter,
    limits: {
      fileSize: MAX_DOC_SIZE,
      files: 4, // 1 cover + 3 proof docs
    },
  }).fields([
    { name: 'image', maxCount: 1 },
    { name: 'proofDocuments', maxCount: 3 },
  ]);
}

/**
 * Build the public delivery URL for a stored image or document.
 * - When AWS S3 is active: routes via CloudFront CDN (if configured) or direct S3 bucket URL.
 * - When local storage is active: routes via local Express static server (/uploads).
 */
function buildImageUrl(s3Key) {
  if (!s3Key) return null;
  if (s3Key.startsWith('http://') || s3Key.startsWith('https://')) {
    return s3Key;
  }

  const cleanKey = String(s3Key).replace(/^\/+/, '');

  // S3 / CloudFront delivery (only when S3 storage is genuinely configured and active)
  if (canUseS3()) {
    const cdnDomain = process.env.CLOUDFRONT_DOMAIN;
    if (cdnDomain && cdnDomain.trim()) {
      let domain = cdnDomain.trim().replace(/\/+$/, '');
      if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
        domain = `https://${domain}`;
      }
      return `${domain}/${cleanKey}`;
    }

    const bucket = process.env.S3_BUCKET_NAME;
    const region = process.env.AWS_REGION || 'us-east-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${cleanKey}`;
  }

  // Local disk dev fallback (serves directly from backend static /uploads folder)
  const port = process.env.PORT || 5000;
  return `http://localhost:${port}/uploads/${cleanKey}`;
}

module.exports = {
  imageUpload,
  campaignUpload,
  buildImageUrl,
  canUseS3,
};
