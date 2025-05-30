/**
 * Test script to simulate authenticated upload requests
 */

const fs = require('fs');
const path = require('path');

async function testAuthenticatedUpload() {
  console.log('Testing authenticated upload functionality...\n');

  // First, let's try to simulate a login to get a session token
  console.log('=== Test 1: Attempting login simulation ===');
  try {
    const loginResponse = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password'
      })
    });

    console.log('Login response status:', loginResponse.status);
    const loginText = await loginResponse.text();
    console.log('Login response:', loginText.substring(0, 200));
  } catch (error) {
    console.log('Login test failed (expected):', error.message);
  }

  // Test with the debug bypass we added
  console.log('\n=== Test 2: Testing upload with debug bypass ===');
  console.log('Setting NODE_ENV to development to test debug bypass...');
  
  // Create a test request with the debug environment
  try {
    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test Client',
      },
      body: JSON.stringify({
        fileType: 'image/jpeg',
        fileSize: 2048000,
        imageType: 'main'
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Raw response text:', responseText);
    
    try {
      const jsonData = JSON.parse(responseText);
      console.log('✅ JSON parsing successful!');
      console.log('Response data keys:', Object.keys(jsonData));
      
      if (jsonData.uploadUrl && jsonData.key) {
        console.log('✅ Upload URL and key received successfully');
        console.log('Upload URL starts with:', jsonData.uploadUrl.substring(0, 50) + '...');
        console.log('S3 key:', jsonData.key);
      } else if (jsonData.error) {
        console.log('❌ Error response:', jsonData.error);
      }
    } catch (parseError) {
      console.log('❌ JSON parsing failed:', parseError.message);
      console.log('Response that failed to parse:', responseText);
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }

  console.log('\n=== Test 3: Testing various file types ===');
  const testCases = [
    { fileType: 'image/png', fileSize: 1024000, imageType: 'main' },
    { fileType: 'image/webp', fileSize: 512000, imageType: 'thumbnail' },
    { fileType: 'image/gif', fileSize: 3072000, imageType: 'gallery' },
  ];

  for (const testCase of testCases) {
    try {
      const response = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase)
      });

      const responseText = await response.text();
      const jsonData = JSON.parse(responseText);
      console.log(`${testCase.fileType}: ${response.status === 200 ? '✅ Success' : '❌ Error'}`);
      
      if (jsonData.error) {
        console.log(`  Error: ${jsonData.error}`);
      }
    } catch (error) {
      console.log(`${testCase.fileType}: ❌ Failed - ${error.message}`);
    }
  }
}

// Run the test
testAuthenticatedUpload().catch(console.error);
