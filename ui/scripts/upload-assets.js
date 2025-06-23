#!/usr/bin/env node

import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const BUCKET_NAME = 'aoe2.site';
const ASSETS_DIR = path.resolve(__dirname, '../src/assets');

const storage = new Storage();
const bucket = storage.bucket(BUCKET_NAME);

/**
 * Upload a file to GCS with proper cache headers
 */
async function uploadFile(localPath, gcsPath) {
  try {
    console.log(`📤 Uploading: ${localPath} → gs://${BUCKET_NAME}/${gcsPath}`);
    
    const file = bucket.file(gcsPath);
    
    // Set cache headers for Cloudflare
    const metadata = {
      cacheControl: 'public, max-age=31536000', // 1 year cache
      contentType: getContentType(localPath)
    };

    await file.save(fs.readFileSync(localPath), { metadata });
    console.log(`✅ Success: gs://${BUCKET_NAME}/${gcsPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to upload ${gcsPath}:`, error.message);
    return false;
  }
}

/**
 * Get content type based on file extension
 */
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Recursively upload directory contents
 */
async function uploadDirectory(localDir, gcsPrefix = '') {
  console.log(`📁 Scanning directory: ${localDir}`);
  
  if (!fs.existsSync(localDir)) {
    console.error(`❌ Directory not found: ${localDir}`);
    return { uploaded: 0, failed: 0 };
  }
  
  const items = fs.readdirSync(localDir);
  console.log(`📋 Found ${items.length} items in ${localDir}`);
  
  let uploaded = 0;
  let failed = 0;
  
  for (const item of items) {
    const localPath = path.join(localDir, item);
    const gcsPath = path.join(gcsPrefix, item).replace(/\\/g, '/');
    
    if (fs.statSync(localPath).isDirectory()) {
      console.log(`📂 Processing subdirectory: ${item}`);
      const result = await uploadDirectory(localPath, gcsPath);
      uploaded += result.uploaded;
      failed += result.failed;
    } else {
      const success = await uploadFile(localPath, `assets/${gcsPath}`);
      if (success) {
        uploaded++;
      } else {
        failed++;
      }
    }
  }
  
  return { uploaded, failed };
}

/**
 * Main upload function
 */
async function uploadAssets() {
  console.log('🚀 Starting asset upload to GCS...');
  console.log(`📁 Source directory: ${ASSETS_DIR}`);
  console.log(`🪣 Target bucket: ${BUCKET_NAME}`);
  console.log('---');
  
  if (!fs.existsSync(ASSETS_DIR)) {
    console.error(`❌ Assets directory not found: ${ASSETS_DIR}`);
    process.exit(1);
  }
  
  try {
    const result = await uploadDirectory(ASSETS_DIR);
    
    console.log('---');
    console.log('📊 Upload Summary:');
    console.log(`✅ Successfully uploaded: ${result.uploaded} files`);
    console.log(`❌ Failed uploads: ${result.failed} files`);
    console.log('');
    console.log('🌐 Assets will be available at: https://aoe2.site/assets/');
    console.log('☁️  Cloudflare will cache these assets automatically');
    
    if (result.failed > 0) {
      console.log('');
      console.log('⚠️  Some files failed to upload. Check the errors above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Upload failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  uploadAssets();
}

export { uploadAssets }; 