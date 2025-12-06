// 🧪 Vercel Webhook Test Script
import https from 'https';
import http from 'http';

const testData = {
  handler: 'widget_detail',
  context: {
    data: {
      name: 'Priya',
      email: 'priya@gmail.com',
      phone: '+91 9876543210'
    }
  }
};

async function testWebhook(url, isLocal = false) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(testData);
    
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log(`\n🧪 Testing ${isLocal ? 'Local' : 'Vercel'} Webhook...`);
    console.log(`📡 URL: ${url}`);
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`✅ Status: ${res.statusCode}`);
          console.log(`📊 Response type: ${response.type}`);
          console.log(`📋 Sections: ${response.sections?.length || 0}`);
          
          if (response.sections && response.sections.length > 0) {
            const firstSection = response.sections[0];
            console.log(`📝 First section: ${firstSection.title}`);
            
            if (firstSection.data && firstSection.data.length > 0) {
              console.log(`📊 Customer data found: ${firstSection.data.length} fields`);
            }
          }
          
          resolve({ 
            success: true, 
            status: res.statusCode, 
            sections: response.sections?.length || 0 
          });
        } catch (e) {
          console.log(`❌ Invalid JSON response`);
          console.log(`Raw response: ${data.substring(0, 200)}...`);
          resolve({ 
            success: false, 
            status: res.statusCode, 
            error: 'Invalid JSON',
            raw: data.substring(0, 200)
          });
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Connection error: ${err.message}`);
      resolve({ 
        success: false, 
        error: err.message 
      });
    });

    req.write(postData);
    req.end();
  });
}

async function testGetEndpoint(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'GET'
    };

    console.log(`\n🔍 Testing GET endpoint...`);
    console.log(`📡 URL: ${url}`);
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`✅ GET Status: ${res.statusCode}`);
          console.log(`📝 Message: ${response.message}`);
          
          resolve({ 
            success: true, 
            status: res.statusCode 
          });
        } catch (e) {
          console.log(`❌ GET Invalid JSON response`);
          resolve({ 
            success: false, 
            status: res.statusCode 
          });
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ GET Connection error: ${err.message}`);
      resolve({ 
        success: false, 
        error: err.message 
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Vercel Webhook Tests...');
  console.log('📡 Testing SalesIQ Customer Data Webhook');
  
  const results = [];
  
  // Test local development server (if running)
  console.log('\n=== LOCAL DEVELOPMENT TEST ===');
  try {
    const localResult = await testWebhook('http://localhost:3000/api/webhook', true);
    results.push({ name: 'Local Dev', ...localResult });
  } catch (e) {
    console.log('⚠️ Local server not running (this is OK if testing production)');
    results.push({ name: 'Local Dev', success: false, error: 'Server not running' });
  }
  
  // Test production Vercel deployment
  console.log('\n=== PRODUCTION VERCEL TEST ===');
  
  // You'll need to replace this with your actual Vercel URL
  const vercelUrl = process.argv[2] || 'https://your-project.vercel.app/api/webhook';
  
  if (vercelUrl.includes('your-project.vercel.app')) {
    console.log('⚠️ Please provide your Vercel URL as an argument:');
    console.log('   node test-vercel-webhook.js https://your-project.vercel.app/api/webhook');
  } else {
    try {
      // Test GET endpoint
      await testGetEndpoint(vercelUrl.replace('/api/webhook', '/api/webhook'));
      
      // Test POST webhook
      const vercelResult = await testWebhook(vercelUrl);
      results.push({ name: 'Vercel Production', ...vercelResult });
    } catch (e) {
      console.log(`❌ Vercel test failed: ${e.message}`);
      results.push({ name: 'Vercel Production', success: false, error: e.message });
    }
  }
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.name} - ${result.status || 'No response'}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.sections) {
      console.log(`   Sections: ${result.sections}`);
    }
  });
  
  const passCount = results.filter(r => r.success).length;
  console.log(`\n🎯 ${passCount}/${results.length} tests passed`);
  
  if (passCount > 0) {
    console.log('🎉 Webhook is working! Ready for SalesIQ integration.');
  } else {
    console.log('⚠️ All tests failed. Check your deployment and configuration.');
  }
}

// Run the tests
runTests().catch(console.error);
