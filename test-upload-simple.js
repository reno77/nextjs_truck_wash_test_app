// Test upload API directly
async function testUpload() {
  try {
    console.log('Starting upload test...');
    
    // Simulate the exact payload that CreateWashForm sends
    const testPayload = {
      fileType: 'image/jpeg',
      fileSize: 1048576, // 1MB
      imageType: 'before'
    };
    
    console.log('Test payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await fetch('http://localhost:3003/api/upload?debug=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });
    
    console.log('Response status:', response.status);
    console.log('Response statusText:', response.statusText);
    
    const responseText = await response.text();
    console.log('Raw response:', responseText);
    
    if (responseText.startsWith('{') || responseText.startsWith('[')) {
      try {
        const parsed = JSON.parse(responseText);
        console.log('Parsed response:', parsed);
      } catch (e) {
        console.error('Failed to parse JSON response:', e.message);
      }
    } else {
      console.log('Response is not JSON. First 100 chars:', responseText.substring(0, 100));
    }
    
  } catch (error) {
    console.error('Request failed:', error);
  }
}

testUpload();
