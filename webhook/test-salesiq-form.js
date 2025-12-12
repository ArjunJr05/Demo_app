// 🧪 Test SalesIQ Form Controller Integration
// Usage: node test-salesiq-form.js

const WEBHOOK_URL = 'https://3be23f2cf1a0.ngrok-free.app/salesiq/form-submit';
const WEBHOOK_SECRET = 'your_shared_secret_here_change_in_production';

// Test cases
const testCases = [
  {
    name: '✅ Valid Cancellation Request',
    payload: {
      order_id: 'ORD1701234567890',
      user_id: 'priya@gmail.com',
      action: 'cancel',
      date: '2024-12-07',
      reason: 'Changed my mind about the purchase',
      refund_details: {
        refundable_amount: 1499,
        refund_method: 'original_payment',
        refund_reference_info: ''
      },
      idempotency_token: `test_${Date.now()}_1`,
      source: 'salesiq_form'
    },
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': WEBHOOK_SECRET
    },
    expectedStatus: 200,
    expectedSuccess: true
  },
  {
    name: '✅ Valid Return Request with Bank Transfer',
    payload: {
      order_id: 'ORD1701234567891',
      user_id: 'sarathy@gmail.com',
      action: 'return',
      date: '2024-12-07',
      reason: 'Product quality issue - wrong color delivered',
      refund_details: {
        refundable_amount: 2999,
        refund_method: 'bank_transfer',
        refund_reference_info: 'HDFC-1234567890'
      },
      idempotency_token: `test_${Date.now()}_2`,
      source: 'salesiq_form'
    },
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': WEBHOOK_SECRET
    },
    expectedStatus: 200,
    expectedSuccess: true
  },
  {
    name: '❌ Invalid Webhook Secret',
    payload: {
      order_id: 'ORD123',
      user_id: 'test@test.com',
      action: 'cancel',
      reason: 'Test',
      refund_details: {
        refundable_amount: 100,
        refund_method: 'original_payment'
      },
      idempotency_token: `test_${Date.now()}_3`,
      source: 'salesiq_form'
    },
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': 'wrong_secret'
    },
    expectedStatus: 401,
    expectedSuccess: false
  },
  {
    name: '❌ Missing Required Field (reason)',
    payload: {
      order_id: 'ORD123',
      user_id: 'test@test.com',
      action: 'cancel',
      refund_details: {
        refundable_amount: 100,
        refund_method: 'original_payment'
      },
      idempotency_token: `test_${Date.now()}_4`,
      source: 'salesiq_form'
    },
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': WEBHOOK_SECRET
    },
    expectedStatus: 400,
    expectedSuccess: false
  },
  {
    name: '❌ Invalid Action Type',
    payload: {
      order_id: 'ORD123',
      user_id: 'test@test.com',
      action: 'invalid_action',
      reason: 'Test reason',
      refund_details: {
        refundable_amount: 100,
        refund_method: 'original_payment'
      },
      idempotency_token: `test_${Date.now()}_5`,
      source: 'salesiq_form'
    },
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': WEBHOOK_SECRET
    },
    expectedStatus: 400,
    expectedSuccess: false
  },
  {
    name: '❌ Reason Too Long (>500 chars)',
    payload: {
      order_id: 'ORD123',
      user_id: 'test@test.com',
      action: 'cancel',
      reason: 'A'.repeat(501), // 501 characters
      refund_details: {
        refundable_amount: 100,
        refund_method: 'original_payment'
      },
      idempotency_token: `test_${Date.now()}_6`,
      source: 'salesiq_form'
    },
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': WEBHOOK_SECRET
    },
    expectedStatus: 400,
    expectedSuccess: false
  },
  {
    name: '❌ Bank Transfer Without Account Info',
    payload: {
      order_id: 'ORD123',
      user_id: 'test@test.com',
      action: 'cancel',
      reason: 'Test cancellation',
      refund_details: {
        refundable_amount: 100,
        refund_method: 'bank_transfer',
        refund_reference_info: '' // Missing bank details
      },
      idempotency_token: `test_${Date.now()}_7`,
      source: 'salesiq_form'
    },
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': WEBHOOK_SECRET
    },
    expectedStatus: 400,
    expectedSuccess: false
  }
];

// Run tests
async function runTests() {
  console.log('🧪 Starting SalesIQ Form Controller Tests\n');
  console.log(`📍 Webhook URL: ${WEBHOOK_URL}`);
  console.log(`🔑 Webhook Secret: ${WEBHOOK_SECRET}\n`);
  console.log('═'.repeat(80));
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    console.log(`\n🧪 Test: ${testCase.name}`);
    console.log('─'.repeat(80));
    
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: testCase.headers,
        body: JSON.stringify(testCase.payload)
      });
      
      const data = await response.json();
      
      console.log(`📊 Status: ${response.status} (Expected: ${testCase.expectedStatus})`);
      console.log(`📦 Response:`, JSON.stringify(data, null, 2));
      
      // Validate response
      const statusMatch = response.status === testCase.expectedStatus;
      const successMatch = data.success === testCase.expectedSuccess;
      
      if (statusMatch && successMatch) {
        console.log('✅ PASSED');
        passed++;
      } else {
        console.log('❌ FAILED');
        if (!statusMatch) console.log(`   Status mismatch: got ${response.status}, expected ${testCase.expectedStatus}`);
        if (!successMatch) console.log(`   Success mismatch: got ${data.success}, expected ${testCase.expectedSuccess}`);
        failed++;
      }
      
    } catch (error) {
      console.log('❌ FAILED - Error:', error.message);
      failed++;
    }
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${passed}/${testCases.length}`);
  console.log(`   ❌ Failed: ${failed}/${testCases.length}`);
  console.log(`   📈 Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%\n`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Your webhook is working correctly.\n');
  } else {
    console.log('⚠️  Some tests failed. Please check the webhook implementation.\n');
  }
}

// Check if fetch is available (Node 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ Error: fetch is not available. Please use Node.js 18 or higher.');
  console.log('   Or install node-fetch: npm install node-fetch');
  process.exit(1);
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test suite error:', error);
  process.exit(1);
});
