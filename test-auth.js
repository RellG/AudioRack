const axios = require('axios');
const tough = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

// Create axios instance with cookie jar for session persistence
const cookieJar = new tough.CookieJar();
const client = wrapper(axios.create({ jar: cookieJar }));

async function testAuthFlow() {
  try {
    console.log('🔍 Testing authentication flow...\n');
    
    // Step 1: Try to access main page (should redirect to login)
    console.log('1. Testing unauthorized access to main page...');
    try {
      const response = await client.get('http://localhost:1314/', { maxRedirects: 0 });
      console.log(`   Status: ${response.status} (unexpected - should redirect)`);
    } catch (error) {
      if (error.response && error.response.status === 302) {
        console.log(`   ✅ Status: 302 (correctly redirects to login)`);
        console.log(`   Redirect to: ${error.response.headers.location}`);
      } else {
        console.log(`   ❌ Unexpected error: ${error.message}`);
      }
    }
    
    // Step 2: Access login page
    console.log('\n2. Testing site-login page access...');
    const loginPageResponse = await client.get('http://localhost:1314/site-login');
    console.log(`   ✅ Status: ${loginPageResponse.status}`);
    
    // Step 3: Authenticate with correct password
    console.log('\n3. Testing authentication...');
    const authResponse = await client.post('http://localhost:1314/api/site-auth', {
      password: 'KingdomAudio223%'
    });
    console.log(`   ✅ Auth Status: ${authResponse.status}`);
    console.log(`   Response: ${JSON.stringify(authResponse.data)}`);
    
    // Step 4: Try to access main page after authentication
    console.log('\n4. Testing authenticated access to main page...');
    const mainPageResponse = await client.get('http://localhost:1314/');
    console.log(`   ✅ Status: ${mainPageResponse.status}`);
    if (mainPageResponse.status === 200) {
      console.log(`   ✅ Successfully accessed main application!`);
    }
    
    // Step 5: Test API access
    console.log('\n5. Testing authenticated API access...');
    const apiResponse = await client.get('http://localhost:1314/api/equipment');
    console.log(`   ✅ API Status: ${apiResponse.status}`);
    if (apiResponse.status === 200) {
      console.log(`   ✅ API access working! Found ${apiResponse.data.data ? apiResponse.data.data.length : 0} equipment items`);
    }
    
    console.log('\n🎉 Authentication flow test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data)}`);
    }
  }
}

// Run the test
testAuthFlow();