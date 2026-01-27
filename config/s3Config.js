// Arquivo: config/s3Config.js
const { S3Client } = require('@aws-sdk/client-s3');
require('dotenv').config();

const REGION = process.env.AWS_REGION || 'us-east-1';
const BUCKET_NAME_PROFILE = process.env.S3_BUCKET_PROFILE;
const BUCKET_NAME_KANBAN = process.env.S3_BUCKET_KANBAN;

const s3_profile = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_PROFILE,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY_PROFILE,
  },
  forcePathStyle: true
});

const s3_kanban = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID_KANBAN,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_KANBAN
  }
});

module.exports = { REGION, s3_profile, BUCKET_NAME_PROFILE, s3_kanban, BUCKET_NAME_KANBAN };