/**
 * Test script to test upload with proper file size
 */

async function testProperSizeUpload() {
  console.log('Testing upload with proper file size...\n');

  const response = await fetch('http://localhost:3000/api/upload?debug=true', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileType: 'image/jpeg',
      fileSize: 512000, // 512KB - well under the 1MB limit
      imageType: 'main'
    })
  });

  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));
  
  const responseText = await response.text();
  console.log('Raw response length:', responseText.length);
  console.log('First 200 characters:', responseText.substring(0, 200));
  
  try {
    const jsonData = JSON.parse(responseText);
    console.log('✅ JSON parsing successful!');
    
    if (jsonData.uploadUrl && jsonData.key) {
      console.log('🎉 SUCCESS! Upload presigned URL generated successfully');
      console.log('S3 key:', jsonData.key);
      console.log('Upload URL length:', jsonData.uploadUrl.length);
      console.log('URL starts with:', jsonData.uploadUrl.substring(0, 50) + '...');
      
      if (jsonData.fields) {
        console.log('Form fields provided:', Object.keys(jsonData.fields));
      }
      
      console.log('\n✅ CONCLUSION: The JSON parsing error has been RESOLVED!');
      console.log('The API now returns valid JSON responses consistently.');
      
    } else if (jsonData.error) {
      console.log('❌ Error response:', jsonData.error);
    }
  } catch (parseError) {
    console.log('❌ JSON parsing failed:', parseError.message);
    console.log('This would indicate our fix didn\'t work completely.');
    console.log('Response that failed to parse:', responseText);
  }
}

// Run the test
testProperSizeUpload().catch(console.error);
