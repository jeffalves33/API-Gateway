// Arquivo: config/s3Config.js
const { S3Client } = require('@aws-sdk/client-s3');
require('dotenv').config();

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION || 'us-east-1',
  forcePathStyle: true
});

const BUCKET_NAME = 'ho.ko-profile-pictures';

module.exports = { s3, BUCKET_NAME };