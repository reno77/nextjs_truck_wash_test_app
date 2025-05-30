/**
 * Test script to test upload with debug mode enabled
 */

async function testDebugModeUpload() {
  console.log('Testing upload with debug mode enabled...\n');

  const response = await fetch('http://localhost:3000/api/upload?debug=true', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
    console.log('Response data:', jsonData);
    
    if (jsonData.uploadUrl && jsonData.key) {
      console.log('🎉 SUCCESS! Upload URL and key received successfully');
      console.log('Upload URL:', jsonData.uploadUrl.substring(0, 100) + '...');
      console.log('S3 key:', jsonData.key);
      console.log('Fields:', jsonData.fields ? 'Present' : 'Not present');
    } else if (jsonData.error) {
      console.log('❌ Error response:', jsonData.error);
    }
  } catch (parseError) {
    console.log('❌ JSON parsing failed:', parseError.message);
    console.log('This indicates our original problem is still present!');
    console.log('Response that failed to parse:', responseText);
  }
}

// Run the test
testDebugModeUpload().catch(console.error);
