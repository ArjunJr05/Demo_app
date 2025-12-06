// 🧪 Webhook Test Script
const http = require('http');

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

// Test both endpoints
const endpoints = [
  { path: '/webhook', name: 'Main Webhook' },
  { path: '/webook', name: 'Typo Webhook' }
];

async function testEndpoint(endpoint) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(testData);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log(`\n🧪 Testing ${endpoint.name} (${endpoint.path})...`);
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`✅ ${endpoint.name} - Status: ${res.statusCode}`);
          console.log(`📊 Response type: ${response.type}`);
          console.log(`📋 Sections: ${response.sections?.length || 0}`);
          
          if (response.sections && response.sections.length > 0) {
            const firstSection = response.sections[0];
            console.log(`📝 First section: ${firstSection.title}`);
          }
          
          resolve({ endpoint: endpoint.name, status: res.statusCode, success: true });
        } catch (e) {
          console.log(`❌ ${endpoint.name} - Invalid JSON response`);
          console.log(`Raw response: ${data.substring(0, 200)}...`);
          resolve({ endpoint: endpoint.name, status: res.statusCode, success: false, error: 'Invalid JSON' });
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ ${endpoint.name} - Connection error: ${err.message}`);
      resolve({ endpoint: endpoint.name, success: false, error: err.message });
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Webhook Tests...');
  console.log('📡 Testing SalesIQ Customer Data Webhook');
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.endpoint} - ${result.status || 'No response'}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  const passCount = results.filter(r => r.success).length;
  console.log(`\n🎯 ${passCount}/${results.length} tests passed`);
  
  if (passCount === results.length) {
    console.log('🎉 All webhook endpoints are working correctly!');
  } else {
    console.log('⚠️ Some endpoints have issues. Check the server logs.');
  }
}

// Run the tests
runTests().catch(console.error);
