const fs = require('fs');

async function testUploadAPI() {
  try {
    console.log('Testing upload API...');
    
    // Test payload
    const payload = {
      fileType: 'image/jpeg',
      fileSize: 1024 * 1024, // 1MB
      imageType: 'before'
    };
    
    console.log('Sending payload:', JSON.stringify(payload, null, 2));
    
    const response = await fetch('http://localhost:3003/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You'll need to add proper authentication headers here
        'Cookie': 'next-auth.session-token=test' // This is just a placeholder
      },
      body: JSON.stringify(payload)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Raw response text:', responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log('Parsed response:', responseJson);
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError.message);
      console.log('Response starts with:', responseText.substring(0, 50));
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testUploadAPI();
