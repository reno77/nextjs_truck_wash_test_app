/**
 * Test script to simulate the exact scenario that was causing the JSON parsing error
 * This reproduces the client-side upload flow from CreateWashForm
 */

const fs = require('fs');
const path = require('path');

async function testUploadWithJSONParsing() {
  console.log('Testing upload functionality with JSON parsing error simulation...\n');

  // Test case 1: Valid upload request (should work)
  console.log('=== Test 1: Valid upload request ===');
  try {
    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileType: 'image/jpeg',
        fileSize: 1024,
        imageType: 'main'
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Raw response text:', responseText);
    console.log('Response text length:', responseText.length);
    console.log('First 50 characters:', responseText.substring(0, 50));
    
    try {
      const jsonData = JSON.parse(responseText);
      console.log('✅ JSON parsing successful:', jsonData);
    } catch (parseError) {
      console.log('❌ JSON parsing failed:', parseError.message);
      console.log('Response that failed to parse:', responseText);
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }

  console.log('\n=== Test 2: Invalid request (missing fields) ===');
  try {
    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Missing required fields to test error handling
      })
    });

    console.log('Response status:', response.status);
    
    const responseText = await response.text();
    console.log('Raw response text:', responseText);
    
    try {
      const jsonData = JSON.parse(responseText);
      console.log('✅ JSON parsing successful:', jsonData);
    } catch (parseError) {
      console.log('❌ JSON parsing failed:', parseError.message);
      console.log('Response that failed to parse:', responseText);
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }

  console.log('\n=== Test 3: Malformed JSON request ===');
  try {
    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{"fileType": "image/jpeg", "fileSize": 1024, "imageType": "main"' // Missing closing brace
    });

    console.log('Response status:', response.status);
    
    const responseText = await response.text();
    console.log('Raw response text:', responseText);
    
    try {
      const jsonData = JSON.parse(responseText);
      console.log('✅ JSON parsing successful:', jsonData);
    } catch (parseError) {
      console.log('❌ JSON parsing failed:', parseError.message);
      console.log('Response that failed to parse:', responseText);
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }

  console.log('\n=== Test 4: Non-JSON response handling ===');
  try {
    const response = await fetch('http://localhost:3000/api/nonexistent', {
      method: 'GET',
    });

    console.log('Response status:', response.status);
    
    const responseText = await response.text();
    console.log('Raw response text:', responseText);
    
    try {
      const jsonData = JSON.parse(responseText);
      console.log('✅ JSON parsing successful:', jsonData);
    } catch (parseError) {
      console.log('❌ JSON parsing failed (expected for non-JSON):', parseError.message);
      console.log('Response that failed to parse:', responseText.substring(0, 100) + '...');
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

// Run the test
testUploadWithJSONParsing().catch(console.error);
