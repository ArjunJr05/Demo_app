const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = 'AIzaSyBs3wgg4lxw8mWMclg4iNXatcxlM3E_ex8';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function testGemini() {
  console.log('🧪 Testing Gemini AI...\n');
  
  try {
    // Test 1: Simple text generation
    console.log('Test 1: Text Generation');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Say hello!');
    const response = result.response.text();
    console.log('✅ Response:', response);
    console.log('\n✅ Gemini AI is working!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('API_KEY_INVALID')) {
      console.error('💡 Your API key is invalid or expired');
    } else if (error.message.includes('quota')) {
      console.error('💡 API quota exceeded');
    }
  }
}

testGemini();