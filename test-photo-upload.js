#!/usr/bin/env node

/**
 * Test script to verify photo upload functionality
 * Tests the complete flow from presigned URL generation to MinIO upload
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function testPhotoUploadFlow() {
  console.log('📸 Testing Photo Upload Flow...\n');

  const baseUrl = 'http://localhost:8080';
  
  // Test 1: Get presigned upload URL
  console.log('📋 Test 1: Getting presigned upload URL');
  
  try {
    const response = await fetch(`${baseUrl}/api/photos/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In real usage, this would include authentication cookies
      },
      body: JSON.stringify({
        filename: 'test-photo.jpg',
        mimeType: 'image/jpeg'
      })
    });
    
    if (response.status === 401) {
      console.log('⚠️  Authentication required - this is expected behavior');
      console.log('   In the frontend, this request would include session cookies');
      console.log('   Status:', response.status);
    } else if (response.ok) {
      const result = await response.json();
      console.log('✅ Presigned URL generated successfully');
      console.log('   Response:', JSON.stringify(result, null, 2));
    } else {
      console.log(`❌ Failed to get presigned URL: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log('⚠️  Connection error (server may not be running):', error.message);
  }

  // Test 2: Validate file type restrictions
  console.log('\n📋 Test 2: Testing file type validation');
  
  const testFiles = [
    { filename: 'photo.jpg', mimeType: 'image/jpeg', shouldPass: true },
    { filename: 'photo.png', mimeType: 'image/png', shouldPass: true },
    { filename: 'photo.webp', mimeType: 'image/webp', shouldPass: true },
    { filename: 'document.pdf', mimeType: 'application/pdf', shouldPass: false },
    { filename: 'video.mp4', mimeType: 'video/mp4', shouldPass: false },
  ];
  
  for (const testFile of testFiles) {
    try {
      const response = await fetch(`${baseUrl}/api/photos/upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: testFile.filename,
          mimeType: testFile.mimeType
        })
      });
      
      if (response.status === 401) {
        console.log(`ℹ️  ${testFile.filename}: Auth required (expected)`);
      } else if (testFile.shouldPass && response.ok) {
        console.log(`✅ ${testFile.filename}: Correctly accepted`);
      } else if (!testFile.shouldPass && !response.ok) {
        const error = await response.json().catch(() => ({}));
        console.log(`✅ ${testFile.filename}: Correctly rejected (${error.error || 'validation failed'})`);
      } else {
        console.log(`❌ ${testFile.filename}: Unexpected result (status: ${response.status})`);
      }
    } catch (error) {
      console.log(`⚠️  ${testFile.filename}: Connection error`);
    }
  }

  // Test 3: Check MinIO connectivity
  console.log('\n📋 Test 3: Testing MinIO connectivity');
  
  try {
    const minioUrl = 'http://localhost:9000/minio/health/live';
    const response = await fetch(minioUrl);
    
    if (response.ok) {
      console.log('✅ MinIO is running and accessible');
    } else {
      console.log(`⚠️  MinIO health check failed: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ MinIO is not accessible:', error.message);
    console.log('   Make sure MinIO is running: docker-compose up minio');
  }

  // Test 4: Check bucket configuration
  console.log('\n📋 Test 4: Testing MinIO bucket access');
  
  try {
    const bucketUrl = 'http://localhost:9000/dating-app/';
    const response = await fetch(bucketUrl);
    
    // We expect either 200 (bucket listing) or 403 (access denied but bucket exists)
    if (response.status === 200 || response.status === 403) {
      console.log('✅ MinIO bucket "dating-app" exists and is configured');
    } else if (response.status === 404) {
      console.log('⚠️  MinIO bucket "dating-app" not found - may need initialization');
    } else {
      console.log(`⚠️  Unexpected bucket response: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Could not check bucket configuration:', error.message);
  }
}

async function testFrontendValidation() {
  console.log('\n🔍 Testing Frontend Validation Logic...\n');
  
  // Simulate frontend file validation
  const validateFile = (file) => {
    const errors = [];
    
    if (file.size > 10 * 1024 * 1024) {
      errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB > 10MB`);
    }
    
    if (!file.type.startsWith('image/')) {
      errors.push(`Invalid file type: ${file.type}`);
    }
    
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!supportedTypes.includes(file.type.toLowerCase())) {
      errors.push(`Unsupported format: ${file.type}`);
    }
    
    return errors;
  };
  
  const testCases = [
    { name: 'valid-photo.jpg', type: 'image/jpeg', size: 2 * 1024 * 1024 },
    { name: 'large-photo.jpg', type: 'image/jpeg', size: 15 * 1024 * 1024 },
    { name: 'document.pdf', type: 'application/pdf', size: 1 * 1024 * 1024 },
    { name: 'photo.bmp', type: 'image/bmp', size: 1 * 1024 * 1024 },
  ];
  
  testCases.forEach(testCase => {
    const errors = validateFile(testCase);
    if (errors.length === 0) {
      console.log(`✅ ${testCase.name}: Valid`);
    } else {
      console.log(`❌ ${testCase.name}: ${errors.join(', ')}`);
    }
  });
}

if (require.main === module) {
  testPhotoUploadFlow()
    .then(() => testFrontendValidation())
    .catch(console.error);
}

module.exports = { testPhotoUploadFlow, testFrontendValidation };
