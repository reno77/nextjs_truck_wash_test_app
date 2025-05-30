// Test script to simulate client-side upload request exactly like the React component would make

// Simulate compressed file data
const mockCompressedFile = {
  type: 'image/jpeg',
  size: 150000 // 150KB
};

async function testClientUpload() {
  console.log('Testing client-side upload request...');
  
  try {
    const response = await fetch('http://localhost:3001/api/upload?debug=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileType: mockCompressedFile.type,
        fileSize: mockCompressedFile.size,
        imageType: 'before',
      }),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);
    
    const responseText = await response.text();
    console.log('Raw response:', responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log('Parsed JSON:', responseJson);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response that failed to parse:', responseText);
    }
    
  } catch (error) {
    console.error('Request failed:', error);
  }
}

testClientUpload();
