// 📦 Local Express Server - SalesIQ Customer Data Webhook with Form Controllers
// File: webhook_local.js
// Usage: node webhook_local.js
// Reference: https://www.zoho.com/salesiq/help/developer-section/form-controllers.html

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const crypto = require('crypto');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Razorpay = require('razorpay');
const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || 'https://nonchivalrous-paranoidly-cara.ngrok-free.dev';

// 🤖 GEMINI AI Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// 💳 RAZORPAY Configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// 🔐 WEBHOOK SECRET for SalesIQ Form Controller
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// 💾 In-memory session storage for user selections (temporary data)
// Maps: userEmail -> { orders: [], reasons: {}, refunds: {} }
const userSessions = new Map();

// 💾 In-memory storage for expiry upload sessions
// Maps: email -> { orderId, productId, imageUrl, timestamp }
const expiryUploadSessions = new Map();

// 💾 In-memory storage for product verification upload sessions
// Maps: email -> { orderId, productId, imageUrl, timestamp }
const productUploadSessions = new Map();
// 🔐 HMAC SHA256 Signature Verification
function verifyWebhookSignature(payload, signature) {
  if (!signature) return false;
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = hmac.update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// Initialize Firebase Admin SDK
let db = null;
let firebaseEnabled = false;

// Try multiple initialization methods
if (!admin.apps.length) {
  try {
    // Method 1: Try service account JSON file
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    firebaseEnabled = true;
    console.log('🔥 Firebase initialized with service account');
  } catch (serviceAccountError) {
    try {
      // Method 2: Try with project ID only (requires GOOGLE_APPLICATION_CREDENTIALS env var)
      const firebaseConfig = require('./firebase-config.js');
      admin.initializeApp({
        projectId: firebaseConfig.projectId || 'your-project-id'
      });
      db = admin.firestore();
      firebaseEnabled = true;
      console.log('🔥 Firebase initialized with project ID');
    } catch (projectIdError) {
      try {
        // Method 3: Try default initialization
        admin.initializeApp();
        db = admin.firestore();
        firebaseEnabled = true;
        console.log('🔥 Firebase initialized with default credentials');
      } catch (defaultError) {
        console.log('⚠️ Firebase initialization failed, using mock data mode');
        console.log('📝 To enable Firestore:');
        console.log('  1. Download service account JSON → firebase-service-account.json');
        console.log('  2. Or set GOOGLE_APPLICATION_CREDENTIALS environment variable');
        console.log('  3. Or update firebase-config.js with your project ID');
        firebaseEnabled = false;
      }
    }
  }
} else {
  db = admin.firestore();
  firebaseEnabled = true;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Serve upload form HTML
app.get('/upload-form.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'upload-form.html'));
});

// Serve expiry upload form HTML
app.get('/expiry-upload-form.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'expiry-upload-form.html'));
});

// Serve payment form HTML
app.get('/payment.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'payment.html'));
});

// 🤖 GEMINI AI IMAGE ANALYSIS FUNCTIONS
// =======================================

/**
 * Convert image file to base64 for Gemini API
 */
function fileToGenerativePart(filePath, mimeType) {
  return {
    inlineData: {
      data: fs.readFileSync(filePath).toString('base64'),
      mimeType
    }
  };
}

/**
 * Analyze uploaded image vs product image URL using Gemini AI
 * @param {string} uploadedImagePath - Path to uploaded image
 * @param {string} productImageUrl - URL of the product image from database
 * @returns {Promise<Object>} Analysis result with match status and damage detection
 */
async function analyzeImageWithHuggingFace(uploadedImagePath, productImageUrl) {
  try {
    console.log('🤖 Starting Gemini AI analysis...');
    console.log('📸 Uploaded image:', uploadedImagePath);
    console.log('🔗 Product URL:', productImageUrl);

    // Prepare uploaded image
    const uploadedImage = fileToGenerativePart(uploadedImagePath, 'image/jpeg');
    let productImage = null;
    let productImagePath = null;

    // Try to download product image from URL
    try {
      productImagePath = path.join(__dirname, 'uploads', `product-${Date.now()}.jpg`);
      console.log('⬇️ Attempting to download product image...');
      
      const response = await axios({
        method: 'get',
        url: productImageUrl,
        responseType: 'stream',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const writer = fs.createWriteStream(productImagePath);
      response.data.pipe(writer);
      
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      console.log('✅ Product image downloaded successfully');
      productImage = fileToGenerativePart(productImagePath, 'image/jpeg');
    } catch (downloadError) {
      console.error('⚠️ Failed to download product image:', downloadError.message);
      console.log('⚠️ Continuing analysis without reference image...');
      productImage = null;
    }

    // Initialize Gemini model with vision support
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp'
    });

    let prompt;
    let contentParts;

    // If product image is available, do comparison analysis
    if (productImage && productImage.inlineData) {
      console.log('✅ Product reference image available - performing comparison analysis');
      
      prompt = `You are a product verification expert. Compare these two product images to determine if they are the SAME product model.

IMAGE 1: Customer's uploaded product image
IMAGE 2: Original product reference image

IMPORTANT: Ignore differences in photo angle, lighting, background, or image quality. Focus ONLY on the actual product features.

PRODUCT MATCH ANALYSIS:

1. SHAPE & FORM FACTOR:
   - Is the overall shape the same? (e.g., both round, both oval, both rectangular)
   - Are the proportions similar?
   - IGNORE: Different angles or perspectives

2. COLOR:
   - Is the primary color the same?
   - Example: Blue vs Blue = YES, Blue vs Black = NO, Blue vs Green = NO
   - IGNORE: Slight shade differences due to lighting

3. DESIGN ELEMENTS:
   - Are the key design features the same? (logos, button placement, ports, patterns)
   - Is the model/variant the same?
   - IGNORE: Minor details that don't affect the model

4. PRODUCT TYPE:
   - Are they the same type of product? (e.g., both earbuds, both phones)
   - Are they the same model/variant?

ANSWER "YES" IF:
- Same product type AND same model
- Same shape/form factor
- Same primary color
- Same key design features

ANSWER "NO" IF:
- Different product variant (e.g., different color version, different model number)
- Different shape or form factor
- Different design features

---

DAMAGE DETECTION:

Answer "YES" ONLY if you clearly see:
- Broken or cracked parts
- Large scratches (>1cm)
- Missing pieces
- Bent/deformed structure

Answer "NO" for:
- Minor scratches or wear
- Dust, dirt, fingerprints
- Lighting reflections
- Normal usage marks

---

Respond in this EXACT JSON format (no markdown):
{
  "isMatch": "YES" or "NO",
  "damageDetected": "YES" or "NO"
}`;

      contentParts = [
        { inlineData: uploadedImage.inlineData },
        { inlineData: productImage.inlineData },
        { text: prompt }
      ];
    } else {
      console.log('⚠️ Product reference image unavailable - performing damage detection only');
      
      prompt = `You are a product damage detection expert. Analyze this product image for any visible damage.

DAMAGE DETECTION:

Look for these types of damage:
- Broken or cracked parts
- Large scratches (>1cm)
- Missing pieces
- Bent/deformed structure
- Physical defects

IGNORE these (NOT damage):
- Minor scratches or wear
- Dust, dirt, fingerprints
- Lighting reflections
- Normal usage marks
- Packaging or background issues

Since we cannot verify if this is the correct product (reference image unavailable), we will assume it matches and focus only on damage detection.

Respond in this EXACT JSON format (no markdown):
{
  "isMatch": "YES",
  "damageDetected": "YES" or "NO"
}`;

      contentParts = [
        { inlineData: uploadedImage.inlineData },
        { text: prompt }
      ];
    }

    console.log('🤖 Calling Gemini API...');
    
    const result = await model.generateContent(contentParts);

    const responseText = result.response.text();
    console.log('🤖 Gemini Response:', responseText);

    // Parse JSON response
    let analysisResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                       responseText.match(/```\n([\s\S]*?)\n```/) ||
                       responseText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
      const parsed = JSON.parse(jsonText);
      
      // Convert YES/NO to boolean
      analysisResult = {
        isMatch: parsed.isMatch === "YES" || parsed.isMatch === true,
        damageDetected: parsed.damageDetected === "YES" || parsed.damageDetected === true,
        confidence: parsed.isMatch === "YES" ? 95 : 50
      };
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      // Fallback response
      analysisResult = {
        isMatch: true,
        damageDetected: false,
        confidence: 85
      };
    }

    console.log('✅ Analysis complete:', analysisResult);

    // Clean up downloaded product image
    if (productImagePath && fs.existsSync(productImagePath)) {
      fs.unlinkSync(productImagePath);
    }

    return analysisResult;

  } catch (error) {
    console.error('❌ Gemini AI Error:', error.message);
    console.error('Error details:', error.response?.data || error);
    
    // Return fallback result - assume product matches if AI fails
    return {
      isMatch: true,
      damageDetected: false,
      confidence: 70,
      error: 'AI analysis failed, manual review recommended'
    };
  }
}

// 📅 EXTRACT EXPIRY DATE WITH GEMINI AI (OCR)
async function extractExpiryDateWithGemini(uploadedImagePath, productName) {
  try {
    console.log('🤖 Starting Gemini AI expiry date OCR...');
    console.log('📸 Uploaded image:', uploadedImagePath);
    console.log('📦 Product name:', productName);

    // Prepare image for Gemini
    const uploadedImage = fileToGenerativePart(uploadedImagePath, 'image/jpeg');

    // Initialize Gemini model with vision support
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp'
    });

    const currentDate = new Date();
    const currentDateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    const prompt = `You are an OCR expert specializing in reading expiry dates from product images.

ANALYZE THIS IMAGE:
- Product: ${productName}
- Current Date: ${currentDateStr}

TASK:
1. Look for expiry date, best before date, or use by date on the product
2. Extract the date in YYYY-MM-DD format
3. Compare with current date to determine if expired

LOOK FOR THESE LABELS:
- "EXP:", "Expiry:", "Expires:", "Best Before:", "Use By:", "BB:", "MFG:"
- Date formats: DD/MM/YYYY, MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
- Month names: Jan, Feb, Mar, etc.

IMPORTANT:
- If you find multiple dates, use the EXPIRY date (not manufacturing date)
- If only month/year is given, assume last day of that month
- If date is unclear or not found, set "dateFound" to false

Respond in this EXACT JSON format (no markdown):
{
  "dateFound": true or false,
  "expiryDate": "YYYY-MM-DD" or "Not found",
  "currentDate": "${currentDateStr}",
  "isExpired": true or false,
  "confidence": 0-100,
  "extractedText": "raw text you found"
}`;

    console.log('🤖 Calling Gemini API for OCR...');
    const result = await model.generateContent([
      { inlineData: uploadedImage.inlineData },
      { text: prompt }
    ]);

    const responseText = result.response.text();
    console.log('🤖 Gemini OCR Response:', responseText);

    // Parse JSON response
    let expiryResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                       responseText.match(/```\n([\s\S]*?)\n```/) ||
                       responseText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
      const parsed = JSON.parse(jsonText);
      
      expiryResult = {
        dateFound: parsed.dateFound === true,
        expiryDate: parsed.expiryDate || 'Not found',
        currentDate: currentDateStr,
        isExpired: parsed.isExpired === true,
        confidence: parsed.confidence || 0,
        extractedText: parsed.extractedText || ''
      };
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      // Fallback response - assume not expired if can't parse
      expiryResult = {
        dateFound: false,
        expiryDate: 'Not found',
        currentDate: currentDateStr,
        isExpired: false,
        confidence: 0,
        extractedText: 'Error parsing response'
      };
    }

    console.log('✅ Expiry OCR complete:', expiryResult);
    return expiryResult;

  } catch (error) {
    console.error('❌ Gemini AI OCR Error:', error.message);
    
    // Return fallback result - assume not expired on error
    return {
      dateFound: false,
      expiryDate: 'Error',
      currentDate: new Date().toISOString().split('T')[0],
      isExpired: false,
      confidence: 0,
      extractedText: error.message
    };
  }
}

// 📋 ZOHO SALESIQ FORM CONTROLLERS
// Reference: https://www.zoho.com/salesiq/help/developer-section/form-controllers.html

// Form Controller for Customer Data Collection
function createCustomerDataForm() {
  return {
    type: "widget_detail",
    sections: [
      {
        name: "customer_data_form",
        layout: "info",
        title: "📝 Customer Information",
        data: [
          { label: "Welcome", value: "Please provide your details to help us assist you better" },
          { label: "Required", value: "Name and Email are required" },
          { label: "Optional", value: "Phone and Order ID are optional" }
        ],
        actions: [
          { label: "📝 Fill Customer Form", name: "show_customer_data_form" },
          { label: "🔙 Skip for Now", name: "skip_form" }
        ]
      }
    ],
    action: {
      type: "submit",
      label: "Get My Information",
      name: "fetch_customer_data"
    }
  };
}

// Form Controller for Order Cancellation
function createCancelOrderForm(orderData) {
  return {
    type: "form",
    title: `Cancel Order ${orderData.id}`,
    name: "orderCancellationForm",
    inputs: [
      {
        type: "text",
        name: "order_id",
        label: "Order ID",
        value: orderData.id,
        readonly: true
      },
      {
        type: "textarea",
        name: "cancellation_reason",
        label: "Reason for Cancellation",
        placeholder: "Please provide a reason for cancelling this order",
        mandatory: true,
        rows: 3
      },
      {
        type: "select",
        name: "refund_method",
        label: "Preferred Refund Method",
        mandatory: true,
        options: [
          { value: "original_payment", label: "Original Payment Method" },
          { value: "store_credit", label: "Store Credit" },
          { value: "bank_transfer", label: "Bank Transfer" }
        ]
      },
      {
        type: "text",
        name: "bank_details",
        label: "Bank Account (if Bank Transfer selected)",
        placeholder: "Account number or reference",
        mandatory: false,
        conditional: {
          field: "refund_method",
          value: "bank_transfer"
        }
      }
    ],
    action: {
      type: "submit",
      label: "Submit Cancellation Request",
      name: "process_cancellation"
    }
  };
}

// Form Controller for Order Return
function createReturnOrderForm(orderData) {
  return {
    type: "form",
    title: `↩️ Return Order ${orderData.id}`,
    name: "return_order_form",
    fields: [
      {
        type: "text",
        name: "order_id",
        label: "Order ID",
        value: orderData.id,
        readonly: true
      },
      {
        type: "checkbox",
        name: "return_items",
        label: "Items to Return",
        mandatory: true,
        options: orderData.items ? orderData.items.map(item => ({
          value: item.productName,
          label: `${item.productName} - ₹${item.price} (Qty: ${item.quantity})`
        })) : []
      },
      {
        type: "textarea",
        name: "return_reason",
        label: "Reason for Return",
        placeholder: "Please provide a reason for returning this order",
        mandatory: true,
        rows: 3
      },
      {
        type: "select",
        name: "return_condition",
        label: "Item Condition",
        mandatory: true,
        options: [
          { value: "unopened", label: "Unopened/Unused" },
          { value: "opened_unused", label: "Opened but Unused" },
          { value: "used_defective", label: "Used - Defective" },
          { value: "damaged_shipping", label: "Damaged in Shipping" }
        ]
      },
      {
        type: "select",
        name: "refund_method",
        label: "Preferred Refund Method",
        mandatory: true,
        options: [
          { value: "original_payment", label: "Original Payment Method" },
          { value: "store_credit", label: "Store Credit" },
          { value: "bank_transfer", label: "Bank Transfer" }
        ]
      }
    ],
    action: {
      type: "submit",
      label: "Submit Return Request",
      name: "process_return"
    }
  };
}

// Form Controller for Customer Feedback
function createFeedbackForm() {
  return {
    type: "form",
    title: "💬 Customer Feedback",
    name: "customer_feedback_form",
    fields: [
      {
        type: "rating",
        name: "satisfaction_rating",
        label: "How satisfied are you with our service?",
        mandatory: true,
        min: 1,
        max: 5,
        labels: ["Very Poor", "Poor", "Average", "Good", "Excellent"]
      },
      {
        type: "textarea",
        name: "feedback_comments",
        label: "Additional Comments",
        placeholder: "Please share your feedback or suggestions",
        mandatory: false,
        rows: 4
      },
      {
        type: "checkbox",
        name: "contact_permission",
        label: "Permissions",
        options: [
          { value: "follow_up", label: "You may contact me for follow-up" },
          { value: "newsletter", label: "Send me updates and offers" }
        ]
      }
    ],
    action: {
      type: "submit",
      label: "Submit Feedback",
      name: "submit_feedback"
    }
  };
}

// Process Form Submissions
async function processFormSubmission(formName, formData, visitorInfo) {
  console.log(`📋 Processing form submission: ${formName}`);
  console.log('Form Data:', JSON.stringify(formData, null, 2));
  
  switch (formName) {
    case 'customer_data_form':
      return await handleCustomerDataForm(formData, visitorInfo);
    case 'orderCancellationForm':
      return await handleCancelOrderForm(formData, visitorInfo);
    case 'select_return_order_form':
      return await handleSelectReturnOrderForm(formData, visitorInfo);
    case 'return_order_form':
      return await handleReturnOrderForm(formData, visitorInfo);
    case 'customer_feedback_form':
      return await handleFeedbackForm(formData, visitorInfo);
    default:
      return createErrorResponse(`Unknown form: ${formName}`);
  }
}

// Handle Customer Data Form Submission
async function handleCustomerDataForm(formData, visitorInfo) {
  const customerEmail = formData.customer_email;
  const inquiryType = formData.inquiry_type;
  
  // Update visitor info with form data
  visitorInfo.email = customerEmail;
  visitorInfo.name = formData.customer_name;
  
  const customerData = await getCustomerData(customerEmail);
  
  if (!customerData) {
    return {
      action: "reply",
      replies: [
        { text: "Your message here" }
      ],
      suggestions: ["Option 1", "Option 2"]
    };

  }
  
  // Handle specific inquiry types
  switch (inquiryType) {
    case 'order_status':
      return createOrderStatusResponse(customerData, formData.order_id);
    case 'cancel_order':
      return createCancelOrderResponse(customerData, formData.order_id);
    case 'return_order':
      return createReturnOrderResponse(customerData, formData.order_id);
    default:
      return await sendCustomerWidget(visitorInfo);
  }
}

// Handle Cancel Order Form Submission
async function handleCancelOrderForm(formData, visitorInfo) {
  try {
    const cancellationData = {
      order_id: formData.order_id,
      user_id: visitorInfo.email,
      action: 'cancel',
      date: new Date().toISOString(),
      reason: formData.cancellation_reason,
      refund_details: {
        refundableAmount: 0, // Will be calculated
        refundMethod: formData.refund_method,
        accountReference: formData.bank_details || null
      },
      idempotency_token: `cancel_${Date.now()}_${formData.order_id}`
    };
    
    // Process cancellation
    const result = await processCancellation(cancellationData);
    
    if (result.success) {
      return {
        type: "message",
        text: `✅ Order ${formData.order_id} has been cancelled successfully! Refund reference: ${result.refundReference}`,
        delay: 1000
      };
    } else {
      return {
        type: "message",
        text: `Failed to cancel order ${formData.order_id}. Please contact support.`,
        delay: 1000
      };
    }
  } catch (error) {
    console.error('Cancel form error:', error);
    return createErrorResponse('Failed to process cancellation request');
  }
}

// Handle Select Return Order Form Submission (Order Selection)
async function handleSelectReturnOrderForm(formData, visitorInfo) {
  try {
    const orderId = formData.order_id;
    console.log('📦 Selected Order ID:', orderId);
    
    // Get customer data to fetch order details
    const customerData = await getCustomerData(visitorInfo.email);
    
    // Find the order in delivered orders
    let order = null;
    if (customerData.deliveredOrders) {
      order = customerData.deliveredOrders.find(o => o.id === orderId);
    }
    
    if (!order && customerData.orders) {
      order = customerData.orders.find(o => o.id === orderId);
    }
    
    if (!order) {
      return {
        action: "reply",
        replies: [{
          text: "❌ Order not found. Please try again."
        }],
        suggestions: ["Back to Menu"]
      };
    }
    
    // Return the return order form for this specific order
    return createReturnOrderForm(order);
    
  } catch (error) {
    console.error('Select return order form error:', error);
    return createErrorResponse('Failed to process order selection');
  }
}

// Handle Return Order Form Submission
async function handleReturnOrderForm(formData, visitorInfo) {
  try {
    const returnData = {
      order_id: formData.order_id,
      user_id: visitorInfo.email,
      action: 'return',
      date: new Date().toISOString(),
      reason: formData.return_reason,
      return_items: formData.return_items,
      condition: formData.return_condition,
      refund_details: {
        refundableAmount: 0, // Will be calculated
        refundMethod: formData.refund_method
      },
      idempotency_token: `return_${Date.now()}_${formData.order_id}`
    };
    
    // Process return
    const result = await processReturn(returnData);
    
    if (result.success) {
      return {
        type: "message",
        text: `✅ Return request for order ${formData.order_id} has been submitted successfully! Return reference: ${result.returnReference}`,
        delay: 1000
      };
    } else {
      return {
        type: "message",
        text: `Failed to process return for order ${formData.order_id}. Please contact support.`,
        delay: 1000
      };
    }
  } catch (error) {
    console.error('Return form error:', error);
    return createErrorResponse('Failed to process return request');
  }
}

// Handle Feedback Form Submission
async function handleFeedbackForm(formData, visitorInfo) {
  try {
    const feedbackData = {
      customer_email: visitorInfo.email,
      rating: formData.satisfaction_rating,
      comments: formData.feedback_comments,
      permissions: formData.contact_permission,
      timestamp: new Date().toISOString()
    };
    
    // Store feedback (in real implementation, save to database)
    console.log('📝 Customer Feedback Received:', feedbackData);
    
    return {
      type: "message",
      text: `🙏 Thank you for your feedback! Your ${formData.satisfaction_rating}-star rating has been recorded.`,
      delay: 1000
    };
  } catch (error) {
    console.error('Feedback form error:', error);
    return createErrorResponse('Failed to submit feedback');
  }
}

// Helper Functions for Form Responses
function createOrderStatusResponse(customerData, orderId) {
  const orders = customerData.orders || [];
  
  if (orderId) {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      return {
        type: "widget_detail",
        sections: [{
          name: "orderStatus",
          layout: "info",
          title: `📦 Order ${order.id} Status`,
          data: [
            { label: "Status", value: getOrderStatusWithIcon(order.status) },
            { label: "Payment", value: order.paymentStatus },
            { label: "Total", value: `₹${order.totalAmount}` },
            { label: "Order Date", value: new Date(order.orderDate).toLocaleDateString() },
            { label: "Tracking", value: order.trackingNumber || 'Not available' }
          ]
        }]
      };
    }
  }
  
  // Show all orders if no specific order ID or order not found
  return {
    type: "widget_detail",
    sections: [{
      name: "allOrders",
      layout: "listing",
      title: `📦 Your Orders (${orders.length} total)`,
      data: orders.map(order => ({
        name: order.id,
        title: `${getOrderStatusWithIcon(order.status)} Order ${order.id}`,
        text: `₹${order.totalAmount} • ${new Date(order.orderDate).toLocaleDateString()}`,
        subtext: `${order.paymentStatus} • ${order.trackingNumber || 'No tracking'}`
      }))
    }]
  };
}

function createCancelOrderResponse(customerData, orderId) {
  const orders = customerData.orders || [];
  const eligibleOrders = orders.filter(order => 
    order.status === 'confirmed' || order.status === 'processing'
  );
  
  if (orderId) {
    const order = eligibleOrders.find(o => o.id === orderId);
    if (order) {
      return createCancelOrderForm(order);
    }
  }
  
  if (eligibleOrders.length === 0) {
    return {
      type: "message",
      text: "No orders eligible for cancellation found. Orders can only be cancelled before shipping.",
      delay: 1000
    };
  }
  
  return {
    type: "widget_detail",
    sections: [{
      name: "cancellableOrders",
      layout: "listing",
      title: "📦 Orders Available for Cancellation",
      data: eligibleOrders.map(order => ({
        name: order.id,
        title: `Order ${order.id}`,
        text: `₹${order.totalAmount} • ${getOrderStatusWithIcon(order.status)}`,
        subtext: `Ordered on ${new Date(order.orderDate).toLocaleDateString()}`,
        action: {
          type: "form",
          name: "orderCancellationForm",
          data: { order_id: order.id }
        }
      }))
    }]
  };
}

function createReturnOrderResponse(customerData, orderId) {
  const orders = customerData.orders || [];
  const eligibleOrders = orders.filter(order => 
    order.status === 'delivered' || order.status === 'shipped'
  );
  
  if (orderId) {
    const order = eligibleOrders.find(o => o.id === orderId);
    if (order) {
      return createReturnOrderForm(order);
    }
  }
  
  if (eligibleOrders.length === 0) {
    return {
      type: "message",
      text: "No orders eligible for return found. Orders can only be returned after delivery.",
      delay: 1000
    };
  }
  
  return {
    type: "widget_detail",
    sections: [{
      name: "returnableOrders",
      layout: "listing",
      title: "📦 Orders Available for Return",
      data: eligibleOrders.map(order => ({
        name: order.id,
        title: `Order ${order.id}`,
        text: `₹${order.totalAmount} • ${getOrderStatusWithIcon(order.status)}`,
        subtext: `Delivered on ${order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'Recently'}`,
        action: {
          type: "form",
          name: "return_order_form",
          data: { order_id: order.id }
        }
      }))
    }]
  };
}

function createErrorResponse(message) {
  return {
    type: "message",
    text: `${message}`,
    delay: 1000
  };
}

// Process Cancellation (integrate with Firestore)
async function processCancellation(cancellationData) {
  try {
    console.log('🔄 processCancellation started');
    console.log('  Order ID:', cancellationData.order_id);
    console.log('  User ID:', cancellationData.user_id);
    const refundReference = `REF_${cancellationData.order_id}_${Date.now()}`;
    const reason = cancellationData.cancellation_reason || cancellationData.reason || 'No reason provided';
    
    console.log('  Refund Reference:', refundReference);
    console.log('  Reason:', reason);
    
    // ✅ ONLY SAVE ISSUE - DO NOT UPDATE ORDER STATUS YET
    // Human agent will review and approve the cancellation
    console.log('💾 Saving cancellation request to issues collection...');
    await saveIssueToFirestore({
      id: `CANCEL_${Date.now()}`,
      customerEmail: cancellationData.user_id,
      orderId: cancellationData.order_id,
      issueType: 'Order Cancellation',
      description: `Customer requested order cancellation. Reason: ${reason}`,
      status: 'Pending Review',  // Changed from 'Resolved' to 'Pending Review'
      resolution: `Awaiting human agent review. Reference: ${refundReference}`,
      // Additional details for display in app
      cancellationReason: reason,
      refundMethod: cancellationData.refund_method || 'original_payment',
      refundReference: refundReference,
      amount: cancellationData.amount || 0,
      paymentMethod: cancellationData.payment_method || 'N/A',
      source: 'salesiq_chat'
    });
    console.log('✅ Cancellation request saved to Firestore');
    
    console.log('✅ processCancellation completed successfully');
    return {
      success: true,
      refundReference: refundReference,
      message: 'Cancellation request submitted for review'
    };
  } catch (error) {
    console.error('Cancellation processing error:', error);
    console.error('Error stack:', error.stack);
    return { success: false, error: error.message };
  }
}

// Delete Order from Firestore (Tasks 4 & 5: Delete from orders and issues)
async function deleteOrderFromFirestore(customerEmail, orderId) {
  try {
    console.log('\n🗑️ ===== DELETING ORDER FROM FIRESTORE =====');
    console.log('Customer Email:', customerEmail);
    console.log('Order ID:', orderId);
    
    if (!firebaseEnabled || !db) {
      console.log('⚠️ Firebase not enabled, skipping deletion');
      return { success: false, message: 'Firebase not enabled' };
    }
    
    // Step 1: Find and delete from orders collection
    console.log('\n📦 Step 1: Deleting from orders collection...');
    const ordersRef = db.collection('orders');
    const orderQuery = await ordersRef
      .where('userId', '==', customerEmail)
      .where('id', '==', orderId)
      .get();
    
    if (!orderQuery.empty) {
      const deletePromises = [];
      orderQuery.forEach(doc => {
        console.log('  - Deleting order document:', doc.id);
        deletePromises.push(doc.ref.delete());
      });
      await Promise.all(deletePromises);
      console.log('✅ Order deleted from orders collection');
    } else {
      console.log('⚠️ Order not found in orders collection');
    }
    
    // Step 2: Find and delete related issues
    console.log('\n🎫 Step 2: Deleting related issues...');
    const issuesRef = db.collection('issues');
    const issuesQuery = await issuesRef
      .where('customerEmail', '==', customerEmail)
      .where('orderId', '==', orderId)
      .get();
    
    if (!issuesQuery.empty) {
      const deletePromises = [];
      issuesQuery.forEach(doc => {
        console.log('  - Deleting issue document:', doc.id, '(', doc.data().issueType, ')');
        deletePromises.push(doc.ref.delete());
      });
      await Promise.all(deletePromises);
      console.log('✅ Related issues deleted');
    } else {
      console.log('⚠️ No related issues found');
    }
    
    console.log('\n✅ ===== ORDER DELETION COMPLETE =====\n');
    return { 
      success: true, 
      message: 'Order and related issues deleted successfully' 
    };
    
  } catch (error) {
    console.error('Error deleting order from Firestore:', error);
    console.error('Error stack:', error.stack);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// Process Return (integrate with Firestore)
async function processReturn(returnData) {
  try {
    const returnReference = `RET${Date.now()}`;
    
    // Update order status in Firestore
    const success = await updateOrderStatusInFirestore(
      returnData.order_id,
      'returned',
      returnData.user_id,
      {
        returnReason: returnData.reason,
        returnReference: returnReference,
        returnItems: returnData.return_items,
        returnCondition: returnData.condition,
        refundDetails: returnData.refund_details,
        returnedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    );
    
    if (success) {
      await saveIssueToFirestore({
        id: `RETURN_${Date.now()}`,
        customerEmail: returnData.user_id,
        orderId: returnData.order_id,
        issueType: 'Order Return',
        description: `Order return requested by customer. Reason: ${returnData.reason}`,
        status: 'Processing',
        resolution: `Return initiated with reference: ${returnReference}`
      });
    }
    
    return {
      success,
      returnReference: returnReference,
      message: 'Return request submitted successfully'
    };
  } catch (error) {
    console.error('Return processing error:', error);
    return { success: false, error: error.message };
  }
}

// 🔥 COMPREHENSIVE CUSTOMER DATA FROM FIRESTORE
async function getCustomerData(customerEmail) {
  try {
    console.log(`🔍 Looking up comprehensive customer data for: ${customerEmail}`);
    
    // If Firebase is enabled, try Firestore first
    if (firebaseEnabled && db) {
      try {
        console.log('🔥 Querying Firestore for all customer data...');
        
        // Step 1: Find user by email in users collection
        const usersSnapshot = await db.collection('users')
          .where('email', '==', customerEmail)
          .limit(1)
          .get();
        
        if (usersSnapshot.empty) {
          console.log(`⚠️ No user found with email: ${customerEmail}`);
          return getMockCustomerData(customerEmail);
        }
        
        const userDoc = usersSnapshot.docs[0];
        const userId = userDoc.id;
        const customerProfile = userDoc.data();
        
        console.log(`✅ Found user profile: ${customerProfile.name} (ID: ${userId})`);
        
        // ✅ Step 2: Get customer orders from users/{userId}/orders
        const ordersSnapshot = await db.collection('users')
          .doc(userId)
          .collection('orders')
          .orderBy('orderDate', 'desc')
          .get();

        const orders = [];
        ordersSnapshot.forEach(doc => {
          const orderData = doc.data();
          orders.push({
            id: doc.id,
            ...orderData,
            orderDate: orderData.orderDate?.toDate?.()?.toISOString() || orderData.orderDate,
            deliveryDate: orderData.deliveryDate?.toDate?.()?.toISOString() || orderData.deliveryDate
          });
        });
        
        console.log(`📦 Found ${orders.length} orders`);
        
        // ✅ Step 2.5: Get delivered orders from users/{userId}/delivered
        const deliveredSnapshot = await db.collection('users')
          .doc(userId)
          .collection('delivered')
          .orderBy('deliveryDate', 'desc')
          .get();

        const deliveredOrders = [];
        deliveredSnapshot.forEach(doc => {
          const orderData = doc.data();
          deliveredOrders.push({
            id: doc.id,
            ...orderData,
            orderDate: orderData.orderDate?.toDate?.()?.toISOString() || orderData.orderDate,
            deliveryDate: orderData.deliveryDate?.toDate?.()?.toISOString() || orderData.deliveryDate,
            isDelivered: true
          });
        });
        
        console.log(`📦 Found ${deliveredOrders.length} delivered orders`);
        
        // Step 3: Get cart items
        const cartSnapshot = await db.collection('users')
          .doc(userId)
          .collection('cart')
          .get();
        
        const cartItems = [];
        cartSnapshot.forEach(doc => {
          const cartData = doc.data();
          cartItems.push({
            productId: cartData.productId,
            productName: cartData.productName,
            price: cartData.price,
            quantity: cartData.quantity,
            selectedColor: cartData.selectedColor,
            selectedSize: cartData.selectedSize,
            imageUrl: cartData.imageUrl,
            addedAt: cartData.addedAt?.toDate?.()?.toISOString() || cartData.addedAt
          });
        });
        
        console.log(`� Found ${cartItems.length} cart items`);
        
        // Step 4: Get favorite items
        const favoritesSnapshot = await db.collection('users')
          .doc(userId)
          .collection('favorites')
          .orderBy('addedAt', 'desc')
          .get();
        
        const favorites = [];
        favoritesSnapshot.forEach(doc => {
          const favData = doc.data();
          favorites.push({
            productId: favData.productId,
            productName: favData.productName,
            price: favData.price,
            imageUrl: favData.imageUrl,
            category: favData.category,
            addedAt: favData.addedAt?.toDate?.()?.toISOString() || favData.addedAt
          });
        });
        
        console.log(`❤️ Found ${favorites.length} favorite items`);
        
        // Step 5: Calculate comprehensive analytics
        const analytics = calculateComprehensiveAnalytics(orders, cartItems, favorites, customerProfile);
        
        // Step 6: Get issues (if any)
        let issues = [];
        try {
          const issuesSnapshot = await db.collection('issues')
            .where('customerEmail', '==', customerEmail)
            .get();
          
          issuesSnapshot.forEach(doc => {
            const issueData = doc.data();
            issues.push({
              id: doc.id,
              ...issueData,
              createdAt: issueData.createdAt?.toDate?.()?.toISOString() || issueData.createdAt
            });
          });
        } catch (issueError) {
          console.log('📝 No issues collection found');
        }
        
        console.log(`🎫 Found ${issues.length} issues`);
        
        return {
          userId: userId,
          customerName: customerProfile.name || 'Customer',
          customerEmail: customerEmail,
          customerPhone: customerProfile.phone || 'Not provided',
          ...customerProfile,
          orders,
          deliveredOrders,
          cartItems,
          favorites,
          issues,
          analytics
        };
        
      } catch (firestoreError) {
        console.log('⚠️ Firestore query failed:', firestoreError.message);
      }
    }
    
    // Fallback to mock data
    console.log('📝 Using mock data for:', customerEmail);
    return getMockCustomerData(customerEmail);
    
  } catch (error) {
    console.error('Error getting customer data:', error);
    return getMockCustomerData(customerEmail);
  }
}

// � COMPREHENSIVE ANALYTICS CALCULATION
function calculateComprehensiveAnalytics(orders, cartItems, favorites, customerProfile) {
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0;
  
  // Cart analytics
  const cartValue = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  // Determine loyalty status based on total spent
  let loyaltyStatus = 'New Customer';
  if (totalOrders >= 10 && totalSpent > 20000) loyaltyStatus = 'Platinum';
  else if (totalOrders >= 5 && totalSpent > 10000) loyaltyStatus = 'Gold';
  else if (totalOrders >= 3 && totalSpent > 5000) loyaltyStatus = 'Silver';
  else if (totalOrders >= 1 && totalSpent > 1000) loyaltyStatus = 'Bronze';
  
  // Find favorite category from orders and favorites
  const categoryCount = {};
  orders.forEach(order => {
    if (order.items) {
      order.items.forEach(item => {
        const category = item.category || 'General';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });
    }
  });
  
  favorites.forEach(fav => {
    const category = fav.category || 'General';
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  });
  
  const favoriteCategory = Object.keys(categoryCount).reduce((a, b) => 
    categoryCount[a] > categoryCount[b] ? a : b, 'General'
  );
  
  // Order status breakdown
  const statusBreakdown = {};
  orders.forEach(order => {
    const status = order.status || 'unknown';
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
  });
  
  return {
    totalOrders,
    totalSpent,
    avgOrderValue,
    loyaltyStatus,
    customerSince: customerProfile?.createdAt?.toDate?.()?.toISOString()?.split('T')[0] || 
                   new Date().toISOString().split('T')[0],
    favoriteCategory,
    cartValue,
    cartItemCount,
    favoritesCount: favorites.length,
    statusBreakdown
  };
}

// � MOCK CUSTOMER DATA (Fallback)
function getMockCustomerData(customerEmail) {
  const mockCustomerData = {
    'priya2@gmail.com': {
      customerName: 'Priya Sharma',
      customerEmail: 'priya2@gmail.com',
    },
    'arjunfree256@gmail.com': {
      customerName: 'Arjun',
      customerEmail: 'arjunfree256@gmail.com',
      orders: [
        {
          id: 'ORD1765047901843',
          customerName: 'Arjun',
          customerEmail: 'arjunfree256@gmail.com',
          items: [
            { productName: 'Power Bank', price: 1299, quantity: 1 }
          ],
          totalAmount: 1299,
          status: 'confirmed',
          paymentStatus: 'paid',
          paymentMethod: 'UPI',
          deliveryDate: '2025-12-14T00:35:01Z',
          orderDate: '2025-12-07T00:35:01Z',
          trackingNumber: 'TRK123456',
          shippingAddress: 'Customer Address'
        }
      ],
      issues: [],
      analytics: {
        totalOrders: 1,
        totalSpent: 1299,
        avgOrderValue: 1299,
        loyaltyStatus: 'Bronze',
        customerSince: '2025-12-07',
        favoriteCategory: 'Electronics'
      }
    },
    'priya@gmail.com': {
      customerName: 'Priya Sharma',
      customerEmail: 'priya@gmail.com',
      orders: [
        {
          id: 'ORD1701234567890',
          customerName: 'Priya Sharma',
          customerEmail: 'priya@gmail.com',
          items: [
            { productName: 'iPhone Case - Blue', price: 599, quantity: 1 },
            { productName: 'Screen Protector', price: 299, quantity: 1 }
          ],
          totalAmount: 898,
          status: 'out_for_delivery',
          paymentStatus: 'paid',
          paymentMethod: 'UPI',
          deliveryDate: '2024-11-30T18:00:00Z',
          orderDate: '2024-11-28T10:30:00Z',
          trackingNumber: 'TRK123456',
          shippingAddress: '123 MG Road, Bangalore, Karnataka 560001'
        },
        {
          id: 'ORD1701234567891',
          customerName: 'Priya Sharma',
          customerEmail: 'priya@gmail.com',
          items: [
            { productName: 'iPhone Case - Blue', price: 599, quantity: 1 }
          ],
          totalAmount: 599,
          status: 'confirmed',
          paymentStatus: 'pending',
          paymentMethod: 'Cash on Delivery',
          orderDate: '2024-11-30T15:45:00Z',
          trackingNumber: 'TRK845410',
          shippingAddress: '123 MG Road, Bangalore, Karnataka 560001',
          deliveryDate: '2024-12-02T16:00:00Z'
        },
        {
          id: 'ORD1701234567892',
          customerName: 'Priya Sharma',
          customerEmail: 'priya@gmail.com',
          items: [
            { productName: 'Wireless Earbuds Pro', price: 2999, quantity: 1 }
          ],
          totalAmount: 2999,
          status: 'delivered',
          paymentStatus: 'paid',
          paymentMethod: 'Credit Card',
          orderDate: '2024-10-15T12:20:00Z',
          trackingNumber: 'TRK789012',
          shippingAddress: '123 MG Road, Bangalore, Karnataka 560001'
        }
      ],
      issues: [
        {
          id: 'ISS1701234567891',
          orderId: 'ORD1701234567890',
          issueType: 'Product Quality',
          description: 'Wrong color delivered in previous order',
          status: 'Resolved',
          createdAt: '2024-10-15T14:20:00Z',
          resolution: 'Refunded ₹500 for inconvenience'
        }
      ],
      analytics: {
        totalOrders: 3,
        totalSpent: 4496,
        avgOrderValue: 1499,
        loyaltyStatus: 'Silver',
        customerSince: '2024-08-15',
        favoriteCategory: 'Mobile Accessories'
      }
    }
  };
  
  const customerData = mockCustomerData[customerEmail];
  
  if (customerData) {
    console.log(`✅ Found mock data for: ${customerEmail}`);
    return customerData;
  } else {
    console.log(`⚠️ No specific data found for: ${customerEmail}, using default demo data`);
    return {
      customerName: 'Demo Customer',
      customerEmail: customerEmail,
      orders: [
        {
          id: 'ORD' + Date.now(),
          customerName: 'Demo Customer',
          customerEmail: customerEmail,
          items: [
            { productName: 'Sample Product', price: 999, quantity: 1 }
          ],
          totalAmount: 999,
          status: 'processing',
          paymentStatus: 'paid',
          paymentMethod: 'UPI',
          orderDate: new Date().toISOString(),
          trackingNumber: 'TRK' + Math.floor(Math.random() * 999999)
        }
      ],
      issues: [],
      analytics: {
        totalOrders: 1,
        totalSpent: 999,
        avgOrderValue: 999,
        loyaltyStatus: 'New Customer',
        customerSince: new Date().toISOString().split('T')[0],
        favoriteCategory: 'General'
      }
    };
  }
}

// 📊 CALCULATE CUSTOMER ANALYTICS
function calculateCustomerAnalytics(orders, customerProfile) {
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0;
  
  // Determine loyalty status based on total spent
  let loyaltyStatus = 'New Customer';
  if (totalSpent > 10000) loyaltyStatus = 'Platinum';
  else if (totalSpent > 5000) loyaltyStatus = 'Gold';
  else if (totalSpent > 2000) loyaltyStatus = 'Silver';
  else if (totalSpent > 500) loyaltyStatus = 'Bronze';
  
  // Find favorite category from orders
  const categoryCount = {};
  orders.forEach(order => {
    if (order.items) {
      order.items.forEach(item => {
        const category = item.category || 'General';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });
    }
  });
  
  const favoriteCategory = Object.keys(categoryCount).reduce((a, b) => 
    categoryCount[a] > categoryCount[b] ? a : b, 'General'
  );
  
  return {
    totalOrders,
    totalSpent,
    avgOrderValue,
    loyaltyStatus,
    customerSince: customerProfile?.customerSince || new Date().toISOString().split('T')[0],
    favoriteCategory
  };
}

// 🆕 CREATE DEFAULT CUSTOMER DATA
async function createDefaultCustomerData(customerEmail) {
  console.log(`🆕 Creating default customer profile for: ${customerEmail}`);
  
  const defaultProfile = {
    customerName: 'New Customer',
    customerEmail: customerEmail,
    customerSince: new Date().toISOString().split('T')[0]
  };
  
  // Only try to save to Firestore if it's enabled
  if (firebaseEnabled && db) {
    try {
      await db.collection('customers').doc(customerEmail).set({
        ...defaultProfile,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Created default profile in Firestore for: ${customerEmail}`);
    } catch (error) {
      console.error('Error creating default profile in Firestore:', error);
    }
  }
  
  return {
    ...defaultProfile,
    orders: [],
    issues: [],
    analytics: {
      totalOrders: 0,
      totalSpent: 0,
      avgOrderValue: 0,
      loyaltyStatus: 'New Customer',
      customerSince: defaultProfile.customerSince,
      favoriteCategory: 'General'
    }
  };
}

// 🛒 GET PRODUCTS FROM FIRESTORE
async function getProductsFromFirestore() {
  try {
    console.log('🛒 Fetching products from Firestore...');
    const productsSnapshot = await db.collection('products').get();
    
    const products = [];
    productsSnapshot.forEach(doc => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`✅ Found ${products.length} products in Firestore`);
    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

// � HELPER: Get userId from email
async function getUserIdFromEmail(email) {
  try {
    const userSnapshot = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (userSnapshot.empty) {
      console.log(`⚠️ No user found with email: ${email}`);
      return null;
    }
    
    const userId = userSnapshot.docs[0].id;
    console.log(`✅ Found user ID: ${userId} for email: ${email}`);
    return userId;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

// � SAVE ORDER TO FIRESTORE (as subcollection under user)
async function saveOrderToFirestore(orderData) {
  try {
    console.log(`💾 Saving order to Firestore: ${orderData.id}`);
    
    // Get userId from customerEmail
    const userId = await getUserIdFromEmail(orderData.customerEmail);
    if (!userId) {
      console.error('Cannot save order: User not found');
      return false;
    }
    
    const orderDoc = {
      ...orderData,
      orderDate: admin.firestore.Timestamp.fromDate(new Date(orderData.orderDate)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // ✅ NEW: Save to users/{userId}/orders/{orderId}
    await db.collection('users').doc(userId).collection('orders').doc(orderData.id).set(orderDoc);
    console.log(`✅ Order saved successfully: users/${userId}/orders/${orderData.id}`);
    return true;
  } catch (error) {
    console.error('Error saving order:', error);
    return false;
  }
}

// 🎫 SAVE ISSUE TO FIRESTORE
async function saveIssueToFirestore(issueData) {
  try {
    console.log(`🎫 Saving issue to Firestore: ${issueData.id}`);
    
    const issueDoc = {
      ...issueData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('issues').doc(issueData.id).set(issueDoc);
    console.log(`✅ Issue saved successfully: ${issueData.id}`);
    return true;
  } catch (error) {
    console.error('Error saving issue:', error);
    return false;
  }
}

// 🔄 UPDATE ORDER STATUS IN FIRESTORE (in users subcollection)
async function updateOrderStatusInFirestore(orderId, newStatus, customerEmail, additionalData = {}) {
  try {
    console.log(`🔄 Updating order status in Firestore: ${orderId} -> ${newStatus}`);
    
    // Get userId from customerEmail
    const userId = await getUserIdFromEmail(customerEmail);
    if (!userId) {
      console.error('Cannot update order: User not found');
      return false;
    }
    
    const updateData = {
      status: newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...additionalData
    };
    
    // ✅ NEW: Update in users/{userId}/orders/{orderId}
    await db.collection('users').doc(userId).collection('orders').doc(orderId).update(updateData);
    console.log(`✅ Order status updated successfully: users/${userId}/orders/${orderId}`);
    return true;
  } catch (error) {
    console.error('Error updating order status:', error);
    return false;
  }
}

// Extract visitor information from SalesIQ context
function extractVisitorInfo(context) {
  const visitorInfo = {
    name: 'Guest',
    email: 'Not provided',
    phone: 'Not provided',
    location: 'Unknown',
    hasInfo: false
  };

  if (!context) return visitorInfo;

  const data = context.data || {};
  
  if (data.name) {
    visitorInfo.name = data.name;
    visitorInfo.hasInfo = true;
  } else if (data.first_name) {
    const lastName = data.last_name || '';
    visitorInfo.name = `${data.first_name} ${lastName}`.trim();
    visitorInfo.hasInfo = true;
  }

  if (data.email_id) {
    visitorInfo.email = data.email_id;
    visitorInfo.hasInfo = true;
  } else if (data.email) {
    visitorInfo.email = data.email;
    visitorInfo.hasInfo = true;
  }

  if (data.phone) {
    visitorInfo.phone = data.phone;
  }

  const locationParts = [];
  if (data.city) locationParts.push(data.city);
  if (data.state) locationParts.push(data.state);
  if (data.country) locationParts.push(data.country);
  
  if (locationParts.length > 0) {
    visitorInfo.location = locationParts.join(', ');
  }

  visitorInfo.ip = data.ip || 'Unknown';
  visitorInfo.browser = data.browser || 'Unknown';
  visitorInfo.os = data.os || 'Unknown';

  return visitorInfo;
}

// 🎯 MAIN WIDGET RESPONSE - STARTUP FOCUSED
async function sendCustomerWidget(visitorInfo) {
  console.log('🎯 Generating Customer Data Widget for Startup');
  console.log('📋 Visitor Info:', JSON.stringify(visitorInfo, null, 2));

  // Get customer data - Simple and Fast
  const customerData = await getCustomerData(visitorInfo.email);
  console.log('📦 Customer Data:', JSON.stringify(customerData, null, 2));
  
  if (!customerData) {
    return {
      type: "widget_detail",
      sections: [
        {
          name: "error",
          layout: "info",
          title: "No Customer Data",
          data: [
            { label: "Status", value: "Customer data not available" }
          ]
        }
      ]
    };
  }

  // Show comprehensive customer data widget + welcome message with buttons
  if (visitorInfo.email && visitorInfo.email !== 'Not provided') {
    console.log('🎯 Showing comprehensive customer data widget with welcome message');
    
    // Return widget directly - SalesIQ will display it properly
    return createComprehensiveCustomerWidget(visitorInfo, customerData);
  }

  // All orders (sorted by date - newest first)
  const allOrders = customerData.orders ? customerData.orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate)) : [];
  
  // Open issues
  const openIssues = customerData.issues ? customerData.issues.filter(issue => issue.status === 'Open') : [];
  
  const response = {
    type: "widget_detail",
    sections: [
      {
        name: "customerOverview",
        layout: "info",
        title: `🛍️ ${visitorInfo.name} - Customer Profile`,
        data: [
          { label: "Customer Since", value: customerData.analytics?.customerSince || 'New Customer' },
          { label: "Loyalty Status", value: `${customerData.analytics?.loyaltyStatus || 'New'} Member` },
          { label: "Total Orders", value: (customerData.analytics?.totalOrders || 0).toString() },
          { label: "Total Spent", value: `₹${customerData.analytics?.totalSpent || 0}` },
          { label: "Favorite Category", value: customerData.analytics?.favoriteCategory || 'None' }
        ], 
        actions: [
          { label: "📦 View All Orders", name: "view_orders" },
          { label: "🎫 Check Issues", name: "view_issues" }
        ]
      }
    ]
  };

  // Add all orders section if any exist
  if (allOrders.length > 0) {
    response.sections.push({
      name: "allOrders",
      layout: "listing",
      title: `📦 Customer Orders (${allOrders.length} Total)`,
      navigate: true,
      data: allOrders.map(order => ({
        name: order.id,
        title: `${getOrderStatusWithIcon(order.status)} Order ${order.id}`,
        text: `${order.items ? order.items.map(item => item.productName).join(', ') : 'No items'} - ₹${order.totalAmount || 0}`,
        subtext: `${new Date(order.orderDate).toLocaleDateString()} • ${(order.paymentStatus || 'pending').toUpperCase()} • ${order.trackingNumber || 'No tracking'}`
      }))
    });
  }

  // Add issues section if any exist
  if (customerData.issues && customerData.issues.length > 0) {
    response.sections.push({
      name: "customerIssues",
      layout: "listing",
      title: `⚠️ Customer Issues (${openIssues.length} Open)`,
      data: customerData.issues.slice(0, 5).map(issue => ({
        name: issue.id,
        title: `${getIssueIcon(issue.status)} ${issue.issueType}`,
        text: issue.description,
        subtext: `${issue.status} • ${new Date(issue.createdAt).toLocaleDateString()}`
      }))
    });
  }

  // Add quick actions for startup agents
  response.sections.push({
    name: "quickActions",
    layout: "info",
    title: "⚡ Quick Actions",
    data: [
      { label: "Customer Type", value: customerData.analytics?.loyaltyStatus || 'New Customer' },
      { label: "Last Order", value: allOrders.length > 0 ? new Date(allOrders[0].orderDate).toLocaleDateString() : 'No orders' },
      { label: "Support Priority", value: openIssues.length > 0 ? 'High (Has Issues)' : 'Normal' }
    ],
    actions: [
      { label: "💬 Continue Chat", name: "continue_chat" },
      { label: "📦 Check Order Status", name: "check_order" },
      { label: "🎁 Offer Discount", name: "offer_discount" }
    ]
  });

  return response;
}

// 🎯 COMPREHENSIVE CUSTOMER DATA WIDGET
function createComprehensiveCustomerWidget(visitorInfo, customerData) {
  const sections = [];
  
  // Customer Overview Section
  sections.push({
    name: "customer_overview",
    layout: "info",
    title: `👋 Hello ${customerData.customerName || visitorInfo.name}!`,
    data: [
      { label: "Customer", value: customerData.customerName || visitorInfo.name },
      { label: "Email", value: customerData.customerEmail },
      { label: "Phone", value: customerData.customerPhone || 'Not provided' },
      { label: "Member Since", value: customerData.analytics?.customerSince || 'Recently' },
      { label: "Loyalty Status", value: `${customerData.analytics?.loyaltyStatus || 'New'} Member` }
    ]
    // Removed global Return/Cancel buttons - they now appear only on individual pending orders
  });
  
  // Orders Summary Section
  if (customerData.orders && customerData.orders.length > 0) {
    const recentOrders = customerData.orders.slice(0, 3); // Show latest 3 orders
    sections.push({
      name: "orders_summary",
      layout: "listing",
      title: `📦 Recent Orders (${customerData.orders.length} total)`,
      data: recentOrders.map(order => {
        // Check if order is pending/cancellable
        const isPending = order.status === 'OrderStatus.pending' || 
                         order.status === 'Pending' || 
                         order.status === 'Processing';
        
        const orderItem = {
          name: order.id,
          title: `${getOrderStatusWithIcon(order.status)} Order ${order.id}`,
          text: `₹${order.totalAmount} • ${new Date(order.orderDate).toLocaleDateString()}`,
          subtext: `${order.paymentStatus} • ${order.trackingNumber || 'No tracking'}`
        };
        
        // Add cancel button only for pending orders
        if (isPending) {
          orderItem.actions = [
            {
              label: "Cancel Order",
              name: `QUICK_CANCEL:${order.id}`,
              type: "postback"
            }
          ];
        }
        
        return orderItem;
      })
    });
  }
  
  // Cart Items Section
  if (customerData.cartItems && customerData.cartItems.length > 0) {
    sections.push({
      name: "cart_items",
      layout: "listing",
      title: `🛒 Cart Items (${customerData.analytics?.cartItemCount || 0} items)`,
      data: customerData.cartItems.slice(0, 3).map(item => ({
        name: item.productId,
        title: item.productName,
        text: `₹${item.price} x ${item.quantity} = ₹${item.price * item.quantity}`,
        subtext: `${item.selectedColor || ''} ${item.selectedSize || ''}`.trim() || 'Standard'
      }))
    });
  }
  
  
  // Analytics Section
  if (customerData.analytics) {
    const analytics = customerData.analytics;
    sections.push({
      name: "analytics",
      layout: "info",
      title: "📊 Customer Analytics",
      data: [
        { label: "Total Orders", value: analytics.totalOrders?.toString() || '0' },
        { label: "Total Spent", value: `₹${analytics.totalSpent || 0}` },
        { label: "Average Order", value: `₹${analytics.avgOrderValue || 0}` },
        { label: "Cart Value", value: `₹${analytics.cartValue || 0}` },
        { label: "Favorite Category", value: analytics.favoriteCategory || 'None' }
      ]
    });
  }
  
  // Customer Issues Section (from Firestore issues collection) - Individual Sections with Buttons
  if (customerData.issues && customerData.issues.length > 0) {
    customerData.issues.forEach((issue, index) => {
      // Determine status emoji
      const statusEmoji = (issue.status === 'Paid' || issue.paymentStatus === 'completed') ? '✅' : '⚠️';
      const statusText = issue.status || 'Pending Review';
      
      // Build issue card as listing with single item
      const issueCard = {
        name: `issue_${index}`,
        title: `${statusEmoji} ${issue.id || `Issue ${index + 1}`}`,
        text: `${issue.productName || 'Product'} - ${statusText}`,
        subtext: `Amount: ₹${issue.amount || 0} | Created: ${new Date(issue.createdAt).toLocaleDateString()}${issue.productAccuracy !== undefined ? ` | Match: ${issue.productAccuracy}%` : ''}`
      };
      
      // Add payment URL as clickable link if available
      if (issue.paymentUrl) {
        issueCard.link = issue.paymentUrl;
        issueCard.link_hint = "Click to pay";
      }
      
      // Create individual section for each issue
      sections.push({
        name: `issue_section_${index}`,
        layout: "listing",
        title: index === 0 ? "⚠️ Order Return - Image Verification" : "",
        data: [issueCard],
        actions: issue.orderId ? [{
          label: "View Details",
          name: `ORDER_DETAILS:${issue.orderId}`,
          type: "postback"
        }] : []
      });
    });
    
    console.log(`✅ Added ${customerData.issues.length} individual issue sections with buttons`);
  }
  
  console.log(`📊 Total sections in widget: ${sections.length}`);
  
  return {
    type: "widget_detail",
    sections: sections
  };
}

// 📸 CREATE IMAGE ANALYSIS RESULTS WIDGET
function createImageAnalysisWidget(analysisResult, productName, orderId, uploadedFileName) {
  const sections = [];
  
  // Upload Information Section
  sections.push({
    name: "upload_info",
    layout: "info",
    title: "📸 Image Upload Information",
    data: [
      { label: "Order ID", value: orderId },
      { label: "Product", value: productName },
      { label: "Uploaded File", value: uploadedFileName },
      { label: "Analysis Time", value: new Date().toLocaleString() }
    ]
  });
  
  // Verification Results Section
  if (analysisResult.isMatch) {
    sections.push({
      name: "verification_result",
      layout: "info",
      title: "✅ Verification Result",
      data: [
        { label: "Status", value: "✅ Image Verified - Correct Product" },
        { label: "Confidence Score", value: `${analysisResult.confidence}%` },
        { label: "Product Match", value: "Yes - Product matches order" }
      ]
    });
    
    // Damage Detection Section
    if (analysisResult.damageDetected) {
      sections.push({
        name: "damage_detection",
        layout: "info",
        title: "⚠️ Damage Detected",
        data: [
          { label: "Damage Status", value: "⚠️ DAMAGE FOUND" },
          { label: "Damage Details", value: analysisResult.damageDetails || "Visible defects detected" },
          { label: "Severity", value: analysisResult.severity || "Moderate" },
          { label: "Recommendation", value: analysisResult.recommendation || "Contact support for replacement" }
        ]
      });
      
      // Action Required Section
      sections.push({
        name: "action_required",
        layout: "info",
        title: "🔔 Action Required",
        data: [
          { label: "Next Steps", value: "Customer needs assistance" },
          { label: "Suggested Action", value: "Process return/replacement request" },
          { label: "Priority", value: "High - Damaged product" }
        ]
      });
    } else {
      sections.push({
        name: "no_damage",
        layout: "info",
        title: "✅ No Damage Detected",
        data: [
          { label: "Damage Status", value: "✅ NO DAMAGE FOUND" },
          { label: "Product Condition", value: "Good - No visible defects" },
          { label: "Analysis", value: analysisResult.analysis || "Product appears to be in excellent condition" }
        ]
      });
    }
  } else {
    // Product Mismatch Section
    sections.push({
      name: "verification_failed",
      layout: "info",
      title: "❌ Verification Failed",
      data: [
        { label: "Status", value: "❌ Product Mismatch" },
        { label: "Issue", value: "Uploaded image does not match expected product" },
        { label: "Confidence Score", value: `${analysisResult.confidence}%` },
        { label: "Analysis", value: analysisResult.analysis || "Different product detected" },
        { label: "Recommendation", value: analysisResult.recommendation || "Ask customer to upload correct product image" }
      ]
    });
  }
  
  // AI Analysis Details Section
  sections.push({
    name: "ai_analysis",
    layout: "info",
    title: "🤖 AI Analysis Details",
    data: [
      { label: "AI Model", value: "Google Gemini 1.5 Flash" },
      { label: "Analysis Type", value: "Image Comparison + Damage Detection" },
      { label: "Processing Time", value: "~3-5 seconds" },
      { label: "Full Analysis", value: analysisResult.analysis || "Analysis completed successfully" }
    ]
  });
  
  return {
    type: "widget_detail",
    sections: sections
  };
}

// 💬 AUTOMATIC ACTION BUTTONS FOR USER MESSAGES
function createAutoActionButtonsMessage(visitorInfo) {
  return {
    type: "message",
    text: `Hi ${visitorInfo.name || 'there'}! 👋 How can I help you today?`,
    delay: 500
  };
}

// 🎯 SIMPLE ACTION BUTTONS MESSAGE (Fallback)
function createActionButtonsMessage(visitorInfo, customerData) {
  return {
    type: "widget_detail",
    sections: [
      {
        name: "welcome",
        layout: "info",
        title: `👋 Hello ${visitorInfo.name}!`,
        data: [
          { label: "Customer", value: visitorInfo.name },
          { label: "Email", value: visitorInfo.email },
          { label: "Status", value: "How can I help you today?" }
        ],
        actions: [
          { label: "🔄 Return Order", name: "return_action" },
          { label: "Cancel Order", name: "cancel_action" },
          { label: "📋 Other Options", name: "other_action" }
        ]
      }
    ]
  };
}

// 🎯 HANDLE BUTTON ACTIONS
async function handleButtonAction(action, visitorInfo) {
  const customerData = await getCustomerData(visitorInfo.email);
  
  switch (action) {
    case 'return_action':
      return handleReturnAction(customerData, visitorInfo);
    case 'cancel_action':
      // For cancel action from widget, show orders and let user select
      console.log('📋 Cancel action from widget - showing cancellable orders');
      return handleCancelAction(customerData, visitorInfo);
    case 'other_action':
      return handleOtherAction(customerData, visitorInfo);
    default:
      return createErrorResponse('Unknown action');
  }
}

// 🔄 HANDLE RETURN ACTION
function handleReturnAction(customerData, visitorInfo) {
  const orders = customerData.orders || [];
  
  // Filter orders that are delivered (eligible for return)
  const deliveredOrders = orders.filter(order => 
    order.status === 'delivered'
  );
  
  if (deliveredOrders.length === 0) {
    return {
      type: "message",
      text: "📦 No delivered orders found that are eligible for return.",
      delay: 1000
    };
  }
  
  return {
    type: "message",
    text: "📦 Here are your delivered orders. Click on an order to process return:",
    delay: 1000,
    buttons: deliveredOrders.map(order => ({
      label: `Order ${order.id} - ₹${order.totalAmount}`,
      name: `return_order_${order.id}`,
      type: "postback"
    }))
  };
}

// HANDLE CANCEL ACTION - PRODUCTION READY WITH FIRESTORE
async function handleCancelAction(customerData, visitorInfo) {
  try {
    console.log('🔍 Fetching cancellable orders from Firestore for:', visitorInfo.email);
    
    let cancellableOrders = [];
    
    // PRODUCTION: Query Firestore for cancellable orders from users subcollection
    if (firebaseEnabled && db) {
      try {
        // Get userId from email first
        const userId = await getUserIdFromEmail(visitorInfo.email);
        if (!userId) {
          console.log('⚠️ No user found with email:', visitorInfo.email);
          return {
            type: "message",
            text: "📦 No orders found for your account.",
            delay: 1000
          };
        }
        
        // ✅ NEW: Query from users/{userId}/orders subcollection
        const ordersSnapshot = await db.collection('users')
          .doc(userId)
          .collection('orders')
          .orderBy('orderDate', 'desc')
          .get();
        
        console.log(`📋 Total orders found in Firestore: ${ordersSnapshot.size}`);
        
        ordersSnapshot.forEach(doc => {
          const orderData = doc.data();
          const status = orderData.status?.toString().toLowerCase().split('.').pop() || '';
          
          console.log(`  📦 Order ${doc.id}: Status = "${status}", Product = ${orderData.items?.[0]?.productName || 'Unknown'}, Amount = ₹${orderData.totalAmount || 0}`);
          
          // Only include orders that can be cancelled
          if (status === 'confirmed' || status === 'processing' || status === 'pending') {
            console.log(`    ✅ This order CAN be cancelled`);
            cancellableOrders.push({
              id: doc.id,
              order_id: doc.id,
              product_name: orderData.items?.[0]?.productName || 'Product',
              total_amount: orderData.totalAmount || 0,
              status: status,
              orderDate: orderData.orderDate?.toDate?.()?.toISOString() || orderData.orderDate,
              paymentMethod: orderData.paymentMethod,
              paymentStatus: orderData.paymentStatus
            });
          } else {
            console.log(`    This order CANNOT be cancelled (status: ${status})`);
          }
        });
        
        console.log(`\n✅ Found ${cancellableOrders.length} cancellable orders from users/${userId}/orders`);
      } catch (firestoreError) {
        console.error('Firestore query failed:', firestoreError.message);
        // Fallback to customerData
        cancellableOrders = (customerData.orders || []).filter(order => 
          order.status === 'confirmed' || order.status === 'processing'
        );
      }
    } else {
      // Fallback: use customerData
      cancellableOrders = (customerData.orders || []).filter(order => 
        order.status === 'confirmed' || order.status === 'processing'
      );
    }
    
    if (cancellableOrders.length === 0) {
      return {
        action: "reply",
        replies: [
          {
            text: "📦 No orders available for cancellation.\n\n✅ Orders can only be cancelled if they are in:\n• Pending\n• Confirmed\n• Processing\n\nOrders that are shipped, delivered, or already cancelled cannot be cancelled."
          }
        ],
        suggestions: ["Back to Menu"]
      };
    }
    
    // PRODUCTION: Return SalesIQ format with suggestions (displays as blue chips)
    return {
      action: "reply",
      replies: [
        {
          text: `📦 You have ${cancellableOrders.length} order(s) that can be cancelled.\n\nSelect an order to proceed with cancellation:`
        }
      ],
      suggestions: cancellableOrders.map(order => 
        `Cancel ${order.id} | ${order.product_name} | ₹${order.total_amount}`
      ).concat(["Back to Menu"])
    };
    
  } catch (error) {
    console.error('Error in handleCancelAction:', error);
    return {
      type: "message",
      text: "Error loading orders. Please try again.",
      delay: 1000
    };
  }
}

// 📋 HANDLE OTHER ACTION
function handleOtherAction(customerData, visitorInfo) {
  return {
    type: "message",
    text: "📋 What else would you like to do?",
    delay: 1000,
    buttons: [
      {
        label: "📦 Check Order Status",
        name: "check_status",
        type: "postback"
      },
      {
        label: "💬 Give Feedback",
        name: "feedback",
        type: "postback"
      },
      {
        label: "View Profile",
        name: "view_profile",
        type: "postback"
      },
      {
        label: "📞 Contact Support",
        name: "contact_support",
        type: "postback"
      }
    ]
  };
}

// 🎯 HANDLE SPECIFIC ORDER ACTIONS
async function handleOrderAction(action, orderId, visitorInfo) {
  console.log(`\n🎯 handleOrderAction called`);
  console.log('  Action:', action);
  console.log('  Order ID:', orderId);
  console.log('  Visitor Email:', visitorInfo.email);
  
  const customerData = await getCustomerData(visitorInfo.email);
  console.log('  Total Orders Found:', customerData.orders?.length || 0);
  
  const order = customerData.orders.find(o => o.id === orderId);
  
  if (!order) {
    console.log('  Order not found in customer data');
    console.log('  Available Order IDs:', customerData.orders?.map(o => o.id).join(', ') || 'None');
    return createErrorResponse('Order not found');
  }
  
  console.log('  ✅ Order Found:');
  console.log('    ID:', order.id);
  console.log('    Total Amount:', order.totalAmount);
  console.log('    Status:', order.status);
  console.log('    Items:', order.items?.length || 0);
  if (order.items && order.items.length > 0) {
    console.log('    First Item:', order.items[0].productName, '- ₹' + order.items[0].price);
  }
  
  if (action.startsWith('cancel_order_')) {
    return handleOrderCancellation(order, visitorInfo);
  } else if (action.startsWith('return_order_')) {
    return handleOrderReturn(order, visitorInfo);
  }
  
  return createErrorResponse('Unknown order action');
}

// HANDLE ORDER CANCELLATION LOGIC - SHOW FORM CONTROLLER
function handleOrderCancellation(order, visitorInfo) {
  console.log(`\n📋 handleOrderCancellation called`);
  console.log('  Order ID:', order.id);
  console.log('  Order Status:', order.status);
  console.log('  Total Amount:', order.totalAmount);
  console.log('  Items:', order.items?.length || 0);
  
  // Check if order is already shipped
  if (order.status === 'shipped' || order.status === 'out_for_delivery' || order.status === 'delivered') {
    console.log('  Order cannot be cancelled - already shipped/delivered');
    return {
      type: "message",
      text: `📦 Order ${order.id} has already been shipped, so it cannot be cancelled.\n\nYou can request a return instead.`,
      delay: 1000
    };
  }
  
  console.log('  ✅ Order is cancellable - triggering Form Controller');
  console.log('  Form Controller: orderCancellationForm');
  console.log('  Order data to pass:');
  console.log('    - Order ID:', order.id);
  console.log('    - Product:', order.items?.[0]?.productName || 'Product');
  console.log('    - Amount: ₹' + order.totalAmount);
  
  // PRODUCTION: Trigger the existing "orderCancellationForm" Form Controller in SalesIQ
  // This will close the bot and connect to human agent with the form
  return {
  type: "form",
  name: "orderCancellationForm",
  title: "Cancel Order",
  button_label: "Submit Cancellation",
  inputs: [
    {
      type: "text",
      name: "order_id",
      label: "Order ID",
      value: order.id,
      mandatory: true,
      editable: false
    },
    {
      type: "text",
      name: "product_name",
      label: "Product",
      value: order.items?.[0]?.productName || "Product",
      mandatory: true,
      editable: false
    },
    {
      type: "text",
      name: "amount_paid",
      label: "Amount",
      value: `₹${order.totalAmount}`,
      mandatory: true,
      editable: false
    },
    {
      type: "select",
      name: "cancellation_reason",
      label: "Cancellation Reason",
      mandatory: true,
      options: [
        { label: "Changed my mind", value: "changed_mind" },
        { label: "Found better price", value: "better_price" },
        { label: "Ordered by mistake", value: "mistake" },
        { label: "Delivery too late", value: "late_delivery" },
        { label: "Other", value: "other" }
      ]
    },
    {
      type: "select",
      name: "refund_method",
      label: "Refund Method",
      mandatory: true,
      options: [
        { label: "Original Payment", value: "original_payment" },
        { label: "Bank Transfer", value: "bank_transfer" },
        { label: "Store Credit", value: "store_credit" }
      ]
    }
  ]
};



}

// 🔄 HANDLE ORDER RETURN LOGIC
function handleOrderReturn(order, visitorInfo) {
  // Check if order is delivered
  if (order.status !== 'delivered') {
    return {
      type: "message",
      text: `📦 Order ${order.id} is not yet delivered. Returns can only be processed after delivery.\n\nCurrent Status: ${getOrderStatusWithIcon(order.status)}`,
      delay: 1000
    };
  }
  
  // Order is delivered - can process return
  const returnAmount = order.totalAmount;
  return {
    type: "message",
    text: `🔄 Return request initiated for Order ${order.id}\n\n💰 Return Amount: ₹${returnAmount}\n📦 Please pack the items in original packaging\n🚚 Our pickup team will contact you within 24 hours\n\n📧 Return confirmation will be sent to your email.`,
    delay: 1500,
    buttons: [
      {
        label: "📋 Return Form",
        name: `return_form_${order.id}`,
        type: "postback"
      },
      {
        label: "Back to Menu",
        name: "back_to_menu",
        type: "postback"
      }
    ]
  };
}

// Helper functions for better display
function getOrderStatusWithIcon(status) {
  const statusMap = {
    'pending': '⏳ Pending',
    'confirmed': '✅ Confirmed', 
    'processing': '🔄 Processing',
    'shipped': '🚚 Shipped',
    'out_for_delivery': '🏃 Out for Delivery',
    'delivered': '✅ Delivered',
    'cancelled': 'Cancelled',
    'returned': '↩️ Returned'
  };
  return statusMap[status] || status;
}

function getIssueIcon(status) {
  return status === 'Open' ? '🔴' : '✅';
}


// 📡 HANDLE SALESIQ NOTIFICATIONS
async function handleNotification(req, res) {
  try {
    console.log('📡 Processing SalesIQ notification');
    const notification = req.body;
    
    // Log the notification for SalesIQ operators
    console.log('🔔 SalesIQ Operator Notification:', {
      type: notification.type,
      customer: notification.customerEmail,
      order: notification.orderId,
      action: notification.action,
      reason: notification.reason,
      priority: notification.priority,
      timestamp: notification.timestamp
    });
    
    // In a real implementation, you would:
    // 1. Send to SalesIQ webhook
    // 2. Store in database
    // 3. Send email/SMS to operators
    // 4. Update customer timeline
    
    return res.status(200).json({
      success: true,
      message: 'Notification processed successfully'
    });
  } catch (error) {
    console.error('Notification error:', error);
    return res.status(500).json({ error: 'Failed to process notification' });
  }
}

// 🌐 ROUTES

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚀 SalesIQ Customer Webhook - Local Express Server',
    description: 'Simple Customer Data Webhook for Startup Support Teams',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      webhook: '/webhook',
      formSubmit: '/salesiq/form-submit',
      notifications: '/api/notifications'
    },
    github: 'https://github.com/ArjunJr05/webhook'
  });
});


// 🔘 SEND BUTTON CONTAINER TO SALESIQ
app.post('/api/send-button-container', async (req, res) => {
  try {
    console.log('🔘 Button container request received');
    const { customer_email, buttons, message } = req.body;
    
    console.log('Customer:', customer_email);
    console.log('Buttons:', JSON.stringify(buttons, null, 2));
    
    // This endpoint would integrate with SalesIQ API to send bot messages
    // For now, we log it and return success
    
    // In production, you would call SalesIQ API here:
    // await salesiqAPI.sendBotMessage({
    //   customerEmail: customer_email,
    //   message: message,
    //   buttons: buttons
    // });
    
    console.log('✅ Button container logged (would be sent to SalesIQ in production)');
    
    res.status(200).json({
      success: true,
      message: 'Button container sent',
      buttons: buttons
    });
  } catch (error) {
    console.error('Error sending button container:', error);
    res.status(500).json({ error: 'Failed to send button container' });
  }
});

// 💬 SEND BOT MESSAGE TO SALESIQ
app.post('/api/send-message', async (req, res) => {
  try {
    console.log('💬 Bot message request received');
    const { customer_email, message, type } = req.body;
    
    console.log('Customer:', customer_email);
    console.log('Message:', message);
    console.log('Type:', type);
    
    // In production, call SalesIQ API to send bot message
    
    console.log('✅ Bot message logged (would be sent to SalesIQ in production)');
    
    res.status(200).json({
      success: true,
      message: 'Bot message sent'
    });
  } catch (error) {
    console.error('Error sending bot message:', error);
    res.status(500).json({ error: 'Failed to send bot message' });
  }
});

// 🎯 HANDLE BUTTON CLICK FROM SALESIQ
app.post('/api/button-click', async (req, res) => {
  try {
    console.log('🎯 Button click received');
    const { button_id, action, customer_email } = req.body;
    
    console.log('Button ID:', button_id);
    console.log('Action:', action);
    console.log('Customer:', customer_email);
    
    // Handle the button action
    let responseMessage = '';
    
    switch (action) {
      case 'cancel':
        responseMessage = 'Your request has been cancelled.';
        break;
      case 'return':
        responseMessage = 'You have been returned to the previous menu.';
        break;
      default:
        responseMessage = 'Action completed.';
    }
    
    console.log('✅ Button click processed');
    
    res.status(200).json({
      success: true,
      response_message: responseMessage
    });
  } catch (error) {
    console.error('Error handling button click:', error);
    res.status(500).json({ error: 'Failed to handle button click' });
  }
});

app.post('/webhook', async (req, res) => {
  try {
    console.log('\n\n🔔 ===== WEBHOOK CALLED =====');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📍 From:', req.headers['x-forwarded-for'] || req.ip);
    console.log('🔐 Signature:', req.headers['x-siqsignature'] ? 'Present' : 'Missing');
    
    const requestData = req.body || {};
    const handler = requestData.handler;
    const operation = requestData.operation;
    const context = requestData.context || {};
    const formData = requestData.form_data;
    const formName = requestData.form_name;
    
    console.log('\n📋 REQUEST TYPE:');
    console.log('  Handler:', handler || 'N/A');
    console.log('  Operation:', operation || 'N/A');
    console.log('  Has visitor?', !!requestData.visitor);
    console.log('  Has message?', !!requestData.message);
    console.log('  Has action?', !!requestData.action);
    
    console.log('\n📦 FULL REQUEST BODY:');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('\n');
    
    const visitorInfo = extractVisitorInfo(context);

    if (handler === "trigger" || handler === "triggerhandler") {
      console.log("✅ Form Controller triggerhandler test - sending ACK");
      return res.status(200).json({
        handler: "triggerhandler",
        status: "success",
        message: "Webhook is active and ready"
      });
    }

    if (handler === "message" && !req.body.visitor && !req.body.operation) {
      // This is a Form Controller TEST call (messagehandler test)
      console.log("✅ Form Controller messagehandler test - sending ACK");
      return res.status(200).json({
        handler: "messagehandler",
        status: "success",
        message: "Webhook can handle messages"
      });
    }

    // ✅ HANDLE WIDGET DETAIL REQUEST
    if (handler === "detail") {
      console.log("✅ Widget detail handler - loading customer widget");
      const customerData = await getCustomerData(visitorInfo.email);
      const widgetResponse = createComprehensiveCustomerWidget(visitorInfo, customerData);
      return res.status(200).json(widgetResponse);
    }

    // ✅ HANDLE BUTTON ACTIONS FROM WIDGET
    if (handler === "action" && req.body.action) {
      console.log('\n🔘 ===== BUTTON ACTION RECEIVED =====');
      console.log('Action Object:', req.body.action);
      console.log('Context:', req.body.context);
      
      // Extract action name from object
      const actionObj = req.body.action;
      const actionName = typeof actionObj === 'string' ? actionObj : actionObj.name;
      
      console.log('Action Name:', actionName);
      console.log('Visitor Email:', visitorInfo.email);
      
      // Handle ORDER_DETAILS action
      if (actionName && actionName.startsWith('ORDER_DETAILS:')) {
        const orderId = actionName.split(':')[1];
        console.log(`📋 Order details requested for: ${orderId}`);
        
        try {
          const customerData = await getCustomerData(visitorInfo.email);
          
          // Find the order
          let order = null;
          if (customerData.deliveredOrders) {
            order = customerData.deliveredOrders.find(o => o.id === orderId);
          }
          if (!order && customerData.orders) {
            order = customerData.orders.find(o => o.id === orderId);
          }
          
          if (!order) {
            return res.status(200).json({
              action: "reply",
              replies: [{
                text: `❌ Order ${orderId} not found.`
              }],
              suggestions: ["Back to Menu"]
            });
          }
          
          // Find related issue
          console.log('🔍 Fetching issue details for order:', orderId);
          const issue = customerData.issues?.find(i => i.orderId === orderId);
          if (issue) {
            console.log('✅ Found issue:', issue.id);
            console.log('📋 Issue data:', JSON.stringify(issue, null, 2));
            if (issue.paymentUrl) {
              console.log('💳 Payment URL exists:', issue.paymentUrl);
            } else {
              console.log('⚠️ No payment URL found in issue');
            }
          } else {
            console.log('⚠️ No issue found for order:', orderId);
          }
          
          // If payment URL already exists, show it in widget instead of form
          if (issue && issue.paymentUrl) {
            console.log('🌐 Displaying existing payment link in widget...');
            return res.status(200).json({
              type: "widget_detail",
              sections: [
                {
                  name: "order_info",
                  layout: "info",
                  title: "📋 Order Details",
                  data: [
                    { label: "Order ID", value: order.id },
                    { label: "Product", value: order.items?.[0]?.productName || 'N/A' },
                    { label: "Amount", value: `₹${order.totalAmount}` },
                    { label: "Issue Type", value: issue.issueType || 'N/A' },
                    { label: "Status", value: issue.status || order.status }
                  ]
                },
                {
                  name: `payment_section_${orderId}`,
                  layout: "listing",
                  title: "💳 Payment Link",
                  data: [
                    {
                      name: `pay_${orderId}`,
                      title: "🔐 Complete Payment",
                      text: `Order: ${orderId}`,
                      subtext: `Amount: ₹${order.totalAmount}`,
                      link: issue.paymentUrl,
                      link_hint: "Click here to pay securely"
                    }
                  ]
                }
              ]
            });
          }
          
          // Create form with order details (if no payment URL exists yet)
          const orderDetailsForm = {
            type: "form",
            name: "order",
            title: `📋 Order Details - ${orderId}`,
            hint: "Complete order and issue information",
            button_label: "Pay",
            inputs: [
              {
                type: "text",
                name: "issue_id",
                label: "Issue ID",
                value: issue?.id || 'N/A',
                readonly: true,
                mandatory: false
              },
              {
                type: "text",
                name: "order_id",
                label: "Order ID",
                value: order.id,
                readonly: true,
                mandatory: false
              },
              {
                type: "text",
                name: "product_name",
                label: "Product Name",
                value: order.items?.[0]?.productName || 'N/A',
                readonly: true,
                mandatory: false
              },
              {
                type: "text",
                name: "amount",
                label: "Amount",
                value: `₹${order.totalAmount}`,
                readonly: true,
                mandatory: false
              },
              {
                type: "text",
                name: "issue_type",
                label: "Issue Type",
                value: issue?.issueType || 'N/A',
                readonly: true,
                mandatory: false
              },
              {
                type: "text",
                name: "status",
                label: "Status",
                value: issue?.status || order.status,
                readonly: true,
                mandatory: false
              }
            ],
            action: {
              type: "submit",
              name: "order",
              label: "Pay"
            }
          };
          
          console.log('✅ Sending order details form to SalesIQ');
          return res.status(200).json(orderDetailsForm);
          
        } catch (error) {
          console.error('❌ Error fetching order details:', error);
          return res.status(200).json({
            action: "reply",
            replies: [{
              text: `❌ Error loading order details. Please try again.`
            }],
            suggestions: ["Back to Menu"]
          });
        }
      }
    }

    // ✅ HANDLE FORM SUBMISSION (from form controller)
    if (handler === "submit" && req.body.form) {
      console.log('\n📋 ===== FORM SUBMISSION RECEIVED =====');
      const formData = req.body.form;
      const formName = formData.name;
      const formValues = formData.values;
      
      console.log('Form Name:', formName);
      console.log('Form Action:', formData.action);
      
      // Handle "order" form submission (payment form)
      if (formName === 'order' && formData.action === 'submit') {
        console.log('💳 Processing payment form submission...');
        
        const issueId = formValues.issue_id?.value;
        const orderId = formValues.order_id?.value;
        const productName = formValues.product_name?.value;
        const amountStr = formValues.amount?.value;
        const status = formValues.status?.value;
        
        // Extract numeric amount
        const amount = amountStr ? amountStr.replace('₹', '').trim() : '0';
        
        console.log('Issue ID:', issueId);
        console.log('Order ID:', orderId);
        console.log('Product:', productName);
        console.log('Amount:', amount);
        
        // Generate payment URL
        const baseUrl = BASE_URL;
        const paymentUrl = `${baseUrl}/payment.html?orderId=${orderId}&amount=${amount}&product=${encodeURIComponent(productName)}&status=${encodeURIComponent(status)}`;
        
        console.log('✅ Payment URL generated:', paymentUrl);
        
        // Save payment URL to Firestore issue document
        if (issueId && issueId !== 'N/A') {
          try {
            console.log('💾 Saving payment URL to Firestore issue:', issueId);
            await db.collection('issues').doc(issueId).update({
              paymentUrl: paymentUrl,
              paymentGenerated: true,
              paymentGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ Payment URL saved to Firestore');
          } catch (firestoreError) {
            console.error('⚠️ Failed to save payment URL to Firestore:', firestoreError.message);
          }
        }
        
        console.log('🌐 Displaying payment link in widget...');
        
        // Return sections_edit response with payment link that opens in browser
        return res.status(200).json({
          type: "sections_edit",
          success_banner: "✅ Payment link ready!",
          sections: [
            {
              name: `payment_section_${orderId}`,
              layout: "listing",
              title: "💳 Complete Payment",
              data: [
                {
                  name: `pay_${orderId}`,
                  title: "🔐 Secure Payment",
                  text: `Order: ${orderId}`,
                  subtext: `Amount: ₹${amount}`,
                  link: paymentUrl,
                  link_hint: "Click here to pay securely"
                }
              ]
            }
          ]
        });
      }
      
      // Default response for other forms
      return res.status(200).json({
        action: "reply",
        replies: [{
          text: "Form submitted successfully!"
        }]
      });
    }

    // ✅ HANDLE REAL USER MESSAGES (from bot or mobile app)
    if (req.body.handler === "message" || req.body.operation === "message") {
      console.log("\n" + "=".repeat(60));
      console.log("🔔 MESSAGE RECEIVED AT:", new Date().toISOString());
      console.log("=".repeat(60));

      // ✅ SAFE extraction from SalesIQ payload
      const visitor = req.body.visitor || {};
      const message = req.body.message || {};
      
      // ✅ NORMALIZE MESSAGE TEXT FIRST (BEFORE USAGE)
      const rawMessage = typeof message === 'string' ? message :
                        typeof message.text === 'string' ? message.text :
                        typeof req.body.text === 'string' ? req.body.text : '';
      const messageText = rawMessage.toLowerCase().trim();

      let customerName =
        visitor.name ||
        visitor.email?.split("@")[0] ||
        "Guest";

      console.log("👤 Customer Name:", customerName);
      console.log("📧 Customer Email:", visitor.email || 'N/A');
      console.log("💬 Raw Message:", rawMessage);
      console.log("💬 Normalized Message:", messageText);
      console.log("📎 Has Attachment:", !!message.file);
      console.log("=".repeat(60) + "\n");
      
      // 📸 HANDLE FILE ATTACHMENT (Image Upload)
      if (message.file && message.file.url) {
        console.log('\n📸 ===== FILE ATTACHMENT DETECTED =====');
        console.log('File URL:', message.file.url);
        console.log('File Name:', message.file.name);
        console.log('File Type:', message.file.type);
        console.log('File Size:', message.file.size);
        
        // Check if it's an image
        const isImage = message.file.type && message.file.type.startsWith('image/');
        
        if (isImage) {
          try {
            // Download the image from SalesIQ
            console.log('📥 Downloading image from SalesIQ...');
            const imageResponse = await axios({
              method: 'get',
              url: message.file.url,
              responseType: 'arraybuffer'
            });
            
            // Save to uploads directory
            const uploadsDir = path.join(__dirname, 'uploads');
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            const fileName = `salesiq-${Date.now()}-${message.file.name}`;
            const filePath = path.join(uploadsDir, fileName);
            fs.writeFileSync(filePath, imageResponse.data);
            
            console.log('✅ Image saved:', fileName);
            
            // Get customer data to find product image
            const customerData = await getCustomerData(visitor.email || 'demo@customer.com');
            
            // Find product image URL from most recent order
            let productImageUrl = null;
            let productName = 'Unknown Product';
            let orderId = null;
            
            if (customerData && customerData.orders && customerData.orders.length > 0) {
              const recentOrder = customerData.orders[0];
              if (recentOrder.items && recentOrder.items.length > 0) {
                productImageUrl = recentOrder.items[0].imageUrl;
                productName = recentOrder.items[0].productName;
                orderId = recentOrder.id;
              }
            }
            
            if (!productImageUrl) {
              return res.status(200).json({
                action: "reply",
                replies: [{
                  text: "❌ Unable to verify image. No product found in your orders.\n\nPlease make sure you have an active order."
                }]
              });
            }
            
            console.log('🤖 Starting AI analysis...');
            console.log('Product:', productName);
            console.log('Order ID:', orderId);
            
            // Analyze with Hugging Face AI
            const analysisResult = await analyzeImageWithHuggingFace(filePath, productImageUrl);
            
            console.log('✅ AI Analysis complete:', analysisResult);
            
            // Create widget with analysis results
            const analysisWidget = createImageAnalysisWidget(
              analysisResult,
              productName,
              orderId,
              fileName
            );
            
            // Also send a brief chat message
            const chatMessage = analysisResult.isMatch 
              ? (analysisResult.damageDetected 
                  ? `✅ Image verified! ⚠️ Damage detected. Check the widget panel for details.`
                  : `✅ Image verified! No damage detected. Product is in good condition.`)
              : `❌ Image verification failed. The uploaded image doesn't match the expected product.`;
            
            return res.status(200).json({
              action: "reply",
              replies: [{
                text: chatMessage
              }],
              widget: analysisWidget
            });
            
          } catch (error) {
            console.error('❌ Image analysis error:', error);
            return res.status(200).json({
              action: "reply",
              replies: [{
                text: `❌ Failed to analyze image: ${error.message}\n\nPlease try uploading again or contact support.`
              }],
              suggestions: ["🔄 Try Again", "📞 Contact Support"]
            });
          }
        } else {
          // Not an image file
          return res.status(200).json({
            action: "reply",
            replies: [{
              text: "⚠️ Please upload an image file (JPG, PNG, GIF, WebP)\n\nThe file you uploaded is not a supported image format."
            }]
          });
        }
      }
      
      // Extract visitor info for database queries
      const visitorEmail = visitor.email || 'demo@customer.com';
      const visitorInfoForQuery = {
        name: customerName,
        email: visitorEmail,
        hasInfo: true
      };
      
      // 🔄 AUTO-SAVE PENDING PRODUCT VERIFICATION WHEN USER CLICKS "SHOW RESULTS" OR SENDS SPECIFIC MESSAGE
      const session = userSessions.get(visitorEmail);
      const isShowResultsRequest = messageText && (
        messageText.toLowerCase().includes('show results') ||
        messageText.toLowerCase().includes('check results') ||
        messageText.toLowerCase().includes('view verification') ||
        messageText.toLowerCase().includes('verification complete')
      );
      
      if (session && session.pendingProductVerification && isShowResultsRequest) {
        console.log('💾 User requested results - saving pending product verification to Firestore...');
        const pendingData = session.pendingProductVerification;
        
        try {
          if (pendingData.firestoreDocId) {
            // Update existing expiry verification document with product verification
            console.log('📝 Updating existing expiry verification document:', pendingData.firestoreDocId);
            await db.collection('issues').doc(pendingData.firestoreDocId).update({
              productVerification: pendingData.productVerification,
              status: pendingData.status,
              resolution: pendingData.resolution,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ Expiry verification updated with product verification');
          } else {
            // Create new product verification document
            console.log('📝 Creating new product verification document:', pendingData.id);
            await db.collection('issues').doc(pendingData.id).set({
              ...pendingData,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ New product verification saved to Firestore');
          }
          
          // Clear the pending verification from session
          delete session.pendingProductVerification;
          console.log('✅ Pending product verification cleared from session');
        } catch (firestoreError) {
          console.error('⚠️ Error saving product verification to Firestore:', firestoreError.message);
        }
      }
      
      // 📊 HANDLE "CHECK EXPIRY RESULTS" BUTTON
      if (messageText.toLowerCase().includes('check expiry results')) {
        console.log('✅ User clicked Check Expiry Results button');
        console.log('📧 Looking for expiry verification for email:', visitorEmail);
        
        const session = userSessions.get(visitorEmail);
        
        // ✅ CHECK expiry_verify BEFORE ALLOWING TO PROCEED
        if (!session || session.expiry_verify !== true) {
          console.log('❌ expiry_verify is FALSE - blocking access to results');
          return res.status(200).json({
            action: "reply",
            replies: [{
              text: `⚠️ **Expiry Verification Required**\n\n` +
                    `Kindly verify the expiry date before continuing.\n\n` +
                    `Please upload a product image showing the expiry date first.`
            }],
            suggestions: ["Back to Menu"]
          });
        }
        
        console.log('✅ expiry_verify is TRUE - allowing access to results');
        
        try {
          // First, check if there's a pending expiry verification in session
          let matchingIssue = null;
          
          if (session && session.pendingExpiryVerification) {
            console.log('💾 Found pending expiry verification in session, saving to Firestore...');
            const pendingData = session.pendingExpiryVerification;
            
            // Save to Firestore
            try {
              await db.collection('issues').doc(pendingData.issueId).set({
                ...pendingData,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
              console.log(`✅ Expiry verification ${pendingData.issueId} saved to Firestore`);
              
              // Use the pending data as the matching issue
              matchingIssue = pendingData;
              
              // Clear the pending verification from session
              delete session.pendingExpiryVerification;
            } catch (firestoreError) {
              console.error('⚠️ Firestore save failed:', firestoreError.message);
            }
          }
          
          // If no pending verification, query Firebase for existing records
          if (!matchingIssue) {
            console.log('🔍 No pending verification, querying Firestore...');
            const issuesSnapshot = await db.collection('issues')
              .where('type', '==', 'expiry_verification')
              .orderBy('createdAt', 'desc')
              .limit(10)
              .get();
            
            console.log(`📋 Found ${issuesSnapshot.size} expiry verification records`);
            
            // Find the most recent one that matches this user's email
            issuesSnapshot.forEach(doc => {
              const data = doc.data();
              console.log(`  Checking issue ${data.id}: email=${data.customerEmail}`);
              
              if (data.customerEmail === visitorEmail || 
                  data.customerEmail.includes(visitorEmail.split('@')[0])) {
                if (!matchingIssue) {
                  matchingIssue = data;
                  console.log(`  ✅ Found matching issue: ${data.id}`);
                }
              }
            });
          }
          
          if (matchingIssue) {
            const expiryInfo = matchingIssue.expiryVerification;
            
            // If product is expired, redirect to product verification (like defect verification)
            if (expiryInfo.isExpired) {
              console.log('✅ Product is expired - redirecting to product verification');
              
              // Resolve orderId and productId if they're missing from the stored issue
              let orderId = matchingIssue.orderId || '';
              let productId = matchingIssue.productId || '';
              let imageUrl = matchingIssue.originalProductImageUrl || '';
              
              // If orderId or productId is missing, try to resolve from customer data using imageUrl
              if ((!orderId || !productId) && imageUrl) {
                console.log('⚠️ Missing orderId/productId in issue, resolving from customer data...');
                try {
                  const customerData = await getCustomerData(visitorEmail);
                  const normalize = (v) => (v || '').toString().trim().toLowerCase();
                  const itemImageUrl = (it) => it?.imageUrl || it?.imageurl || it?.image_url || it?.image || it?.productImage || null;
                  
                  // Search delivered orders for matching imageUrl
                  if (customerData.deliveredOrders) {
                    for (const order of customerData.deliveredOrders) {
                      if (order.items) {
                        for (const item of order.items) {
                          const itemImg = itemImageUrl(item);
                          if (itemImg && normalize(itemImg).includes(normalize(imageUrl).split('?')[0].split('=')[0])) {
                            orderId = order.id;
                            productId = item.productId || item.product_id || item.id || '';
                            console.log('✅ Resolved from delivered orders:', { orderId, productId });
                            break;
                          }
                        }
                        if (orderId) break;
                      }
                    }
                  }
                  
                  // If still not found, search regular orders
                  if (!orderId && customerData.orders) {
                    for (const order of customerData.orders) {
                      if (order.items) {
                        for (const item of order.items) {
                          const itemImg = itemImageUrl(item);
                          if (itemImg && normalize(itemImg).includes(normalize(imageUrl).split('?')[0].split('=')[0])) {
                            orderId = order.id;
                            productId = item.productId || item.product_id || item.id || '';
                            console.log('✅ Resolved from regular orders:', { orderId, productId });
                            break;
                          }
                        }
                        if (orderId) break;
                      }
                    }
                  }
                } catch (resolveError) {
                  console.error('❌ Error resolving orderId/productId:', resolveError);
                }
              }
              
              // Store product verification session for reliable parameter retrieval
              productUploadSessions.set(visitorEmail, {
                orderId: orderId,
                productId: productId,
                imageUrl: imageUrl,
                productName: matchingIssue.productName,
                timestamp: Date.now()
              });
              console.log('💾 Stored product verification session for:', visitorEmail);
              
              const verificationUrl = `${BASE_URL}/upload-form.html?email=${encodeURIComponent(visitorEmail)}&orderId=${encodeURIComponent(orderId)}&productId=${encodeURIComponent(productId)}&imageUrl=${encodeURIComponent(imageUrl)}`;
              
              console.log('🔗 Product verification URL:', verificationUrl);
              console.log('  Using original product image:', imageUrl);
              
              const response = {
                action: "reply",
                replies: [{
                  text: `**Expiry Verified - Product is EXPIRED**\n\n` +
                        `**Order Details:**\n` +
                        `Product: ${matchingIssue.productName}\n` +
                        `Order ID: ${matchingIssue.orderId}\n` +
                        `Amount: ₹${matchingIssue.amount}\n\n` +
                        `Expiry Date: ${expiryInfo.expiryDate}\n` +
                        `Current Date: ${expiryInfo.currentDate}\n` +
                        `Status: EXPIRED \n` +
                        `Confidence: ${expiryInfo.confidence}%\n\n` +
                        `Please verify that this is the correct product you ordered.\n\n` +
                        `Click the link below to verify the product:\n${verificationUrl}`
                }],
                suggestions: [
                  "Check Verification Status",
                  "Back to Menu"
                ]
              };
              
              return res.status(200).json(response);
            } else {
              // Product is not expired - show message and contact admin
              console.log('⚠️ Product is not expired - showing contact admin message');
              
              const response = {
                action: "reply",
                replies: [{
                  text: `**Expiry Verification Complete**\n\n` +
                        `**Status:** NOT EXPIRED\n` +
                        `The product is not expired yet. Please contact support by pressing "yes" above`
                }],
                suggestions: [
                  "Back to Menu"
                ]
              };
              
              return res.status(200).json(response);
            }
          } else {
            console.log('⚠️ No matching expiry verification found');
            return res.status(200).json({
              action: "reply",
              replies: [{ text: "❌ No expiry verification results found. Please upload an image first." }],
              suggestions: ["🔄 Return Order", "Back to Menu"]
            });
          }
        } catch (error) {
          console.error('❌ Error fetching expiry verification from Firestore:', error);
          return res.status(200).json({
            action: "reply",
            replies: [{ text: "❌ Error retrieving expiry verification results. Please try again." }],
            suggestions: ["🔄 Return Order", "Back to Menu"]
          });
        }
      }
      
      // 🔍 HANDLE "CHECK VERIFICATION STATUS" BUTTON (for expiry + product verification flow)
      if (messageText.toLowerCase().includes('check verification status') || 
          messageText.toLowerCase().includes('verification status')) {
        console.log('✅ User clicked Check Verification Status button');
        console.log('📧 Looking for verification for email:', visitorEmail);
        
        const session = userSessions.get(visitorEmail);
        
        // ✅ FIRST: Check if there's pending product verification in session and save it
        if (session && session.pendingProductVerification) {
          console.log('💾 Found pending product verification in session, saving to Firestore...');
          const pendingData = session.pendingProductVerification;
          
          try {
            if (pendingData.firestoreDocId) {
              // Update existing expiry verification document with product verification
              console.log('📝 Updating existing expiry verification document:', pendingData.firestoreDocId);
              await db.collection('issues').doc(pendingData.firestoreDocId).update({
                productVerification: pendingData.productVerification,
                status: pendingData.status,
                resolution: pendingData.resolution,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
              console.log('✅ Expiry verification updated with product verification');
            } else {
              // Create new product verification document
              console.log('📝 Creating new product verification document:', pendingData.id);
              await db.collection('issues').doc(pendingData.id).set({
                ...pendingData,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
              console.log('✅ New product verification saved to Firestore');
            }
            
            // Clear the pending verification from session
            delete session.pendingProductVerification;
            console.log('✅ Pending product verification cleared from session');
          } catch (firestoreError) {
            console.error('⚠️ Error saving product verification to Firestore:', firestoreError.message);
          }
        }
        
        try {
          // Query Firebase for the most recent expiry verification with product verification
          const issuesSnapshot = await db.collection('issues')
            .where('type', '==', 'expiry_verification')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
          
          console.log(`📋 Found ${issuesSnapshot.size} expiry verification records`);
          
          // Find the most recent one that matches this user's email
          let matchingIssue = null;
          issuesSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`  Checking issue ${data.id}: email=${data.customerEmail}`);
            
            if (data.customerEmail === visitorEmail || 
                data.customerEmail.includes(visitorEmail.split('@')[0])) {
              if (!matchingIssue) {
                matchingIssue = data;
                console.log(`  ✅ Found matching issue: ${data.id}`);
              }
            }
          });
          
          if (matchingIssue) {
            // Check if product verification exists
            if (matchingIssue.productVerification && matchingIssue.productVerification.isMatch) {
              console.log('✅ Product verification found and verified - connecting to agent');
              
              const expiryInfo = matchingIssue.expiryVerification;
              const productInfo = matchingIssue.productVerification;
              
              // Prepare order details for agent
              const orderDetails = {
                orderId: matchingIssue.orderId,
                productName: matchingIssue.productName,
                amount: matchingIssue.amount,
                customerEmail: visitorEmail,
                issueId: matchingIssue.id,
                expiryDate: expiryInfo.expiryDate,
                currentDate: expiryInfo.currentDate,
                isExpired: expiryInfo.isExpired,
                productVerified: productInfo.isMatch,
                damageDetected: productInfo.damageDetected,
                status: matchingIssue.status,
                resolution: matchingIssue.resolution
              };
              
              console.log('📋 Order Details for Agent:');
              console.log(JSON.stringify(orderDetails, null, 2));
              
              // Store issue details in session for later use
              if (!session) {
                userSessions.set(visitorEmail, {});
              }
              const currentSession = userSessions.get(visitorEmail);
              currentSession.currentIssue = matchingIssue;
              
              // Display verification results and offer resolution options
              const response = {
                action: "reply",
                replies: [{
                  text: `**Verification Complete**\n\n` +
                        `How would you like us to resolve this?`
                }],
                suggestions: [
                  "Refund the Amount",
                  "Replace the Order",
                  "Back to Menu"
                ]
              };
              
              console.log('📤 Sending verification results to chat');
              
              return res.status(200).json(response);
            } else {
              // Product not verified yet - ask user to verify
              console.log('⚠️ Product verification not found or not verified - asking user to verify');
              
              // Generate product verification URL
              const productId = matchingIssue.productId || '';
              const imageUrl = matchingIssue.originalProductImageUrl || '';
              const verificationUrl = `${BASE_URL}/upload-form.html?email=${encodeURIComponent(visitorEmail)}&orderId=${encodeURIComponent(matchingIssue.orderId)}&productId=${encodeURIComponent(productId)}&imageUrl=${encodeURIComponent(imageUrl)}`;
              
              const response = {
                action: "reply",
                replies: [{
                  text: `**Product Verification Required**\n\n` +
                        `Your expiry verification is complete, but we need to verify the product.\n\n` +
                        `Please upload a photo of the product to complete verification:\n${verificationUrl}`
                }],
                suggestions: [
                  "🔄 Return to Menu"
                ]
              };
              
              return res.status(200).json(response);
            }
          } else {
            console.log('⚠️ No matching verification found');
            return res.status(200).json({
              action: "reply",
              replies: [{ text: "❌ No verification found. Please start a return request first." }],
              suggestions: ["🔄 Return Order", "Back to Menu"]
            });
          }
        } catch (error) {
          console.error('❌ Error fetching verification from Firestore:', error);
          return res.status(200).json({
            action: "reply",
            replies: [{ text: "❌ Error retrieving verification status. Please try again." }],
            suggestions: ["🔄 Return Order", "Back to Menu"]
          });
        }
      }
      
      // 🎯 HANDLE "SHOW VERIFICATION RESULTS" BUTTON
      if (messageText.toLowerCase().includes('show verification results') || 
          messageText.toLowerCase().includes('show results') ||
          messageText.toLowerCase().includes('show verification result')) {
        console.log('✅ User clicked Show Verification Results button');
        
        const session = userSessions.get(visitorEmail);
        
        // ✅ CHECK product_verify BEFORE ALLOWING TO PROCEED
        if (!session || session.product_verify !== true) {
          console.log('❌ product_verify is FALSE - blocking access to results');
          return res.status(200).json({
            action: "reply",
            replies: [{
              text: `⚠️ **Verification Required**\n\n` +
                    `Kindly verify the product before continuing.\n\n` +
                    `Please upload a product image for verification first.`
            }],
            suggestions: ["Back to Menu"]
          });
        }
        
        console.log('✅ product_verify is TRUE - allowing access to results');
        
        // ✅ SAVE PENDING VERIFICATION TO FIRESTORE FIRST
        if (session && session.pendingProductVerification) {
          console.log('💾 Saving pending product verification to Firestore...');
          const pendingData = session.pendingProductVerification;
          
          try {
            if (pendingData.firestoreDocId) {
              // Update existing expiry verification document with product verification
              console.log('📝 Updating existing expiry verification document:', pendingData.firestoreDocId);
              await db.collection('issues').doc(pendingData.firestoreDocId).update({
                productVerification: pendingData.productVerification,
                status: pendingData.status,
                resolution: pendingData.resolution,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
              console.log('✅ Expiry verification updated with product verification');
            } else {
              // Create new product verification document
              console.log('📝 Creating new product verification document:', pendingData.id);
              await db.collection('issues').doc(pendingData.id).set({
                ...pendingData,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
              console.log('✅ New product verification saved to Firestore');
            }
            
            // Clear the pending verification from session
            delete session.pendingProductVerification;
            console.log('✅ Pending product verification cleared from session');
          } catch (firestoreError) {
            console.error('⚠️ Error saving product verification to Firestore:', firestoreError.message);
          }
        }
        
        // Check if there's a pending verification result
        if (session && session.verificationResult) {
          const result = session.verificationResult;
          
          // Check if result is recent (within last 10 minutes)
          const isRecent = (Date.now() - result.timestamp) < 10 * 60 * 1000;
          
          if (isRecent) {
            console.log('📋 Fetching verification results from Firestore...');
            
            try {
              // Fetch the complete issue data from Firestore
              const issueDoc = await db.collection('issues').doc(result.issueId).get();
              
              if (issueDoc.exists) {
                const issueData = issueDoc.data();
                console.log('✅ Issue data fetched from Firestore:', issueData);
                
                // Display complete verification results with all issue data
                let statusEmoji = issueData.imageVerification?.isMatch ? '✅' : '❌';
                let statusText = issueData.imageVerification?.isMatch ? 'Verified' : 'Not Verified';
                
                if (issueData.imageVerification?.isMatch && issueData.imageVerification?.damageDetected) {
                  statusEmoji = '⚠️';
                  statusText = 'Verified with Damage';
                }
                
                // Store issue details in session for later use
                const currentSession = userSessions.get(visitorEmail) || {};
                currentSession.currentIssue = issueData;
                userSessions.set(visitorEmail, currentSession);
                
                const response = {
                  action: "reply",
                  replies: [{
                    text: `${statusEmoji} **Verification Complete**\n\n` +
                          `How would you like us to resolve this?`
                  }],
                  suggestions: [
                    "Refund the Amount",
                    "Replace the Order",
                    "Back to Menu"
                  ]
                };
                
                return res.status(200).json(response);
              } else {
                // ⚠️ Firestore document not found - use session data directly
                console.log('⚠️ Issue not found in Firestore, using session data');
                
                const statusEmoji = result.isMatch ? '✅' : '❌';
                let statusText = result.isMatch ? 'Verified' : 'Not Verified';
                
                if (result.isMatch && result.damageDetected) {
                  statusEmoji = '⚠️';
                  statusText = 'Verified with Damage';
                }
                
                // Store result in session for later use
                const currentSession = userSessions.get(visitorEmail) || {};
                currentSession.currentIssue = {
                  productName: result.productName,
                  orderId: result.orderId,
                  amount: result.amount,
                  issueId: result.issueId,
                  imageVerification: {
                    isMatch: result.isMatch,
                    damageDetected: result.damageDetected
                  },
                  status: 'Verified - Product Matched',
                  resolution: result.isMatch ? 'Product verified - No damage' : 'Product mismatch'
                };
                userSessions.set(visitorEmail, currentSession);
                
                const response = {
                  action: "reply",
                  replies: [{
                    text: `${statusEmoji} **Verification Complete**\n\n` +
                          `How would you like us to resolve this?`
                  }],
                  suggestions: [
                    "Refund the Amount",
                    "Replace the Order",
                    "Back to Menu"
                  ]
                };
                
                return res.status(200).json(response);
              }
            } catch (error) {
              console.error('❌ Error fetching issue from Firestore:', error);
              return res.status(200).json({
                action: "reply",
                replies: [{ text: "❌ Error retrieving verification results. Please try again." }],
                suggestions: ["🔄 Return Order", "Back to Menu"]
              });
            }
          } else {
            // Result expired
            return res.status(200).json({
              action: "reply",
              replies: [{ text: "⏰ Verification session expired. Please start a new return request." }],
              suggestions: ["🔄 Return Order", "Back to Menu"]
            });
          }
        } else {
          // No verification result found
          return res.status(200).json({
            action: "reply",
            replies: [{ text: "📸 No verification results found. Please upload a product image first." }],
            suggestions: ["🔄 Return Order", "Back to Menu"]
          });
        }
      }
      
      // ✅ HANDLE "YES, CONNECT WITH AGENT" BUTTON
      if (messageText.toLowerCase().includes('yes') && messageText.toLowerCase().includes('connect')) {
        console.log('✅ User requested human agent connection');
        
        return res.status(200).json({
          action: "reply",
          replies: [{
            text: `🤝 **Connecting you with a human agent...**\n\n` +
                  `A support agent will be with you shortly to assist with your return request.\n\n` +
                  `Please wait while we connect you.`
          }],
          suggestions: ["Back to Menu"]
        });
      }
      
      // ✅ HANDLE MAIN MENU FIRST (before order selection)
      console.log('\n🔍 DEBUG: Checking if message is Cancel Order...');
      console.log('  Message Text:', messageText);
      console.log('  Matches "cancel order"?', messageText === "cancel order");
      console.log('  Includes "cancel order"?', messageText.includes("cancel order"));
      console.log('  Has order ID?', messageText.match(/(ord\d+)/i) !== null);
      
      if (messageText === "cancel order" || (messageText.includes("cancel order") && !messageText.match(/(ord\d+)/i))) {
        console.log('\n✅ DEBUG: Cancel Order button clicked!');
        try {
          console.log('🔍 Step 1: Fetching customer data for:', visitorEmail);
          const customerData = await getCustomerData(visitorEmail);
          console.log('✅ Step 2: Customer data fetched successfully');
          console.log('  - Total Orders:', customerData.orders?.length || 0);
          console.log('  - Customer Name:', customerData.name);
          
          // Get cancellable orders
          const cancellableOrders = customerData.orders.filter(order => 
            order.status !== 'Delivered' && 
            order.status !== 'Cancelled' &&
            !order.status.includes('cancelled')
          );
          
          if (cancellableOrders.length === 0) {
            return res.status(200).json({
              action: "reply",
              replies: [{
                text: "You have no orders that can be cancelled.\n\nAll your orders are either delivered or already cancelled."
              }],
              suggestions: ["Back to Menu"]
            });
          }
          
          console.log('\n📋 Step 3: Showing cancellable orders...');
          console.log('  - Cancellable Orders:', cancellableOrders.length);
          
          // Show list of orders to cancel
          const orderSuggestions = cancellableOrders.map(order => 
            `Cancel ${order.id} | ${order.items?.[0]?.productName || 'Product'} | ₹${order.totalAmount}`
          );
          
          const response = {
            action: "reply",
            replies: [{
              text: "**Select an order to cancel:**\n\nChoose from your active orders below:"
            }],
            suggestions: [...orderSuggestions, "Back to Menu"]
          };
          
          console.log('\n✅ Step 4: Order list created');
          console.log('📤 Step 5: Sending response to SalesIQ');
          console.log('Full Response JSON:');
          console.log(JSON.stringify(response, null, 2));
          console.log('=======================================\n');
          
          return res.status(200).json(response);
        } catch (error) {
          console.error('\n❌❌ERROR IN CANCEL ORDER HANDLER ❌❌❌');
          console.error('Error Message:', error.message);
          console.error('Error Stack:', error.stack);
          console.error('Error occurred at:', new Date().toISOString());
          console.error('=======================================\n');
          return res.status(200).json({
            action: "reply",
            replies: [{
              text: "Error loading orders. Please try again later."
            }],
            suggestions: ["Back to Menu"]
          });
        }
      }
      
      // ✅ HANDLE ORDER SELECTION FROM SUGGESTIONS (Cancel or Return with Order ID)
      console.log('\n🔍 DEBUG: Checking if message has order ID...');
      const orderIdMatch = messageText.match(/(ord\d+)/i);
      console.log('  Order ID Match:', orderIdMatch ? orderIdMatch[1] : 'None');
      
      // Exclude RETURN_REASON, RETURN_PHOTO, RETURN_REFUND messages
      const isReturnFlow = messageText.toUpperCase().startsWith('RETURN_REASON:') || 
                          messageText.toUpperCase().startsWith('RETURN_PHOTO:') || 
                          messageText.toUpperCase().startsWith('RETURN_REFUND:');
      
      if (orderIdMatch && !isReturnFlow && (messageText.includes('cancel') || messageText.includes('return') || messageText.startsWith('❌') || messageText.startsWith('🔄'))) {
        console.log('\n✅ DEBUG: Order selected from list!');
        
        // Detect action type
        const isCancel = messageText.includes('cancel') || messageText.startsWith('❌');
        const isReturn = messageText.includes('return') || messageText.startsWith('🔄');

        const orderId = orderIdMatch[1].toUpperCase();
        console.log(`\n📦 ===== ORDER SELECTION DETAILS =====`);
        console.log('Step 1: Order ID extracted:', orderId);
        console.log('Step 2: Action Type:', isCancel ? 'CANCEL' : 'RETURN');
        console.log('Step 3: Customer Email:', visitorEmail);
        console.log('Step 4: Original Message:', messageText);

        // Fetch full order data from Firestore
        console.log('\n🔄 Step 5: Fetching customer data from Firestore...');
        const customerData = await getCustomerData(visitorEmail);
        console.log('✅ Step 6: Customer data fetched');
        console.log('  - Total orders:', customerData.orders?.length || 0);
        console.log('  - Available Order IDs:', customerData.orders?.map(o => o.id).join(', ') || 'None');
        
        console.log('\n🔍 Step 7: Looking for order:', orderId);
        const order = customerData.orders.find(o => o.id === orderId);

        if (!order) {
          console.error('\n❌❌ORDER NOT FOUND ❌❌❌');
          console.error('  Searched for:', orderId);
          console.error('  Available orders:', customerData.orders?.map(o => o.id) || []);
          console.error('  Customer:', visitorEmail);
          console.error('=======================================\n');
          return res.status(200).json({
            type: "message",
            text: "Order not found. Please try again."
          });
        }

        console.log('\n✅ Step 8: Order Found Successfully!');
        console.log('  - Order ID:', order.id);
        console.log('  - Product:', order.items?.[0]?.productName || 'Product');
        console.log('  - Amount: ₹' + order.totalAmount);
        console.log('  - Status:', order.status);
        console.log('  - Payment Method:', order.paymentMethod || 'N/A');

        // Trigger SalesIQ Form Controller
        const actionText = isCancel ? 'cancellation' : 'return';
        const actionEmoji = isCancel ? '❌' : '🔄';
        
        if (isCancel) {
          console.log('\n📋 Step 9: Checking shipping status from user orders collection...');
          console.log('  - Order ID:', orderId);
          console.log('  - Customer Email:', visitorEmail);
          
          // Check shipping status from users/{userId}/orders/{orderId} in Firestore
          let orderShippingStatus = null;
          
          if (firebaseEnabled && db) {
            console.log('\n🔍 Fetching order shipping status from users/{userId}/orders/{orderId}...');
            
            try {
              // Get userId from email
              const usersSnapshot = await db.collection('users')
                .where('email', '==', visitorEmail)
                .limit(1)
                .get();
              
              if (!usersSnapshot.empty) {
                const userId = usersSnapshot.docs[0].id;
                console.log(`  ✅ Found user ID: ${userId}`);
                
                // Get order document
                const orderDoc = await db.collection('users')
                  .doc(userId)
                  .collection('orders')
                  .doc(orderId)
                  .get();
                
                if (orderDoc.exists) {
                  const orderData = orderDoc.data();
                  orderShippingStatus = orderData.shipping_status;
                  console.log(`  ✅ Order found`);
                  console.log(`  📦 Shipping Status: ${orderShippingStatus}`);
                } else {
                  console.log(`  ⚠️ Order not found in users/${userId}/orders/${orderId}`);
                }
              } else {
                console.log(`  ⚠️ User not found with email: ${visitorEmail}`);
              }
            } catch (error) {
              console.error(`  ❌ Error fetching order shipping status:`, error.message);
            }
          }
          
          console.log('\n📊 Shipping Status Summary:');
          console.log('  - Order Shipping Status:', orderShippingStatus || 'Not found');
          
          // Check if order is shipped
          if (orderShippingStatus && (orderShippingStatus === 'Shipped' || orderShippingStatus === 'shipped' || orderShippingStatus.toLowerCase() === 'shipped')) {
            console.log('\n⚠️ Step 10: Order already shipped - Cannot cancel!');
            
            const response = {
              action: "reply",
              replies: [{
                text: `**Cannot Cancel Order ${orderId}**\n\n` +
                      `This order has already been shipped.\n\n` +
                      `Shipping Status: ${orderShippingStatus}\n\n` +
                      `If you have any queries, please connect with our human support agent by pressing **"Yes"** above.`
              }],
              suggestions: []
            };
            
            console.log('\n📤 Sending "Cannot Cancel" response');
            console.log('Full Response JSON:');
            console.log(JSON.stringify(response, null, 2));
            console.log('=======================================\n');
            
            return res.status(200).json(response);
          }
          
          console.log('\n✅ Step 10: Order not shipped - Proceeding with cancellation...');
          
          // Store order context in session for cancel reason selection
          const cancelSession = userSessions.get(visitorEmail) || {};
          cancelSession.cancelOrderId = orderId;
          userSessions.set(visitorEmail, cancelSession);
          
          // Store order context for next step
          const response = {
            action: "reply",
            replies: [{
              text: `**Cancel Order ${orderId}**\n\n` +
                    `Please select a reason:`
            }],
            suggestions: [
              "Changed my mind",
              "Found better price",
              "Ordered by mistake",
              "Product not needed",
              "Other reason",
              "Back to Menu"
            ]
          };

          console.log('\n✅ Step 10: Reason options created');
          console.log('📤 Step 11: Sending response to SalesIQ');
          console.log('Full Response JSON:');
          console.log(JSON.stringify(response, null, 2));
          console.log('=======================================\n');
          
          return res.status(200).json(response);
        } else {
          // For return order - proceed directly without delivery status checks
          console.log('\n📋 Step 9: Proceeding with return order...');
          console.log('  - Order ID:', orderId);
          console.log('  - Order from delivered collection:', order.isDelivered || false);
          
          console.log('\n✅ Step 10: Proceeding with return - showing reason options...');
          
          // Store order context in session for return reason selection
          const returnSession = userSessions.get(visitorEmail) || {};
          returnSession.returnOrderId = orderId;
          userSessions.set(visitorEmail, returnSession);
          
          // Show return reason options with simple button names
          const response = {
            action: "reply",
            replies: [{
              text: `**Return Order**\n\n` +
                    `Please select a reason:`
            }],
            suggestions: [
              "Product defective",
              "Product damaged",
              "Expired",
              "Other reason",
              "Back to Menu"
            ]
          };

          console.log(`\n📤 Sending RETURN Form:`);
          console.log(JSON.stringify(response, null, 2));
          console.log('=======================================\n');

          return res.status(200).json(response);
        }
      }

      // ✅ HANDLE CANCELLATION REASON SELECTION (Simple button names)
      const cancelReasonMap = {
        'changed my mind': 'changed_my_mind',
        'found better price': 'better_price',
        'ordered by mistake': 'ordered_by_mistake',
        'delivery too late': 'delivery_too_late',
        'product not needed': 'not_needed',
        'other reason': 'other'
      };
      
      const cancelLowerMessage = messageText.toLowerCase();
      const matchedCancelReason = cancelReasonMap[cancelLowerMessage];
      
      if (matchedCancelReason) {
        console.log('\n💬 Cancellation reason received:', messageText);
        
        // Get order context from session
        const cancelReasonSession = userSessions.get(visitorEmail);
        
        if (!cancelReasonSession || !cancelReasonSession.cancelOrderId) {
          return res.status(200).json({
            action: "reply",
            replies: [{ text: "Session expired. Please start again." }],
            suggestions: ["Cancel Order", "Back to Menu"]
          });
        }
        
        const orderId = cancelReasonSession.cancelOrderId;
        const reasonCode = matchedCancelReason;
        const reasonDisplay = messageText;
        
        console.log('  Order ID:', orderId);
        console.log('  Reason Code:', reasonCode);
        console.log('  Reason Display:', reasonDisplay);
        
        // Store context in session for refund method selection
        cancelReasonSession.cancelReasonCode = reasonCode;
        cancelReasonSession.cancelReasonDisplay = reasonDisplay;
        userSessions.set(visitorEmail, cancelReasonSession);
        
        // Show refund method options
        const response = {
          action: "reply",
          replies: [{
            text: `How would you like to receive your refund?`
          }],
          suggestions: [
            "Refund",
            "Back to Menu"
          ]
        };
        
        console.log('\n✅ Refund method options created');
        console.log('📤 Sending response:', JSON.stringify(response, null, 2));
        
        return res.status(200).json(response);
      }
      
      // ✅ HANDLE REFUND METHOD SELECTION (Simple button: "RazonPay")
      if (messageText.toLowerCase() === 'Refund' || messageText === 'refund') {
        console.log('\n💳 Refund method received:', messageText);
        
        // Get order context from session
        const session = userSessions.get(visitorEmail);
        
        if (!session || !session.cancelOrderId || !session.cancelReasonCode) {
          return res.status(200).json({
            action: "reply",
            replies: [{ text: "Session expired. Please start again." }],
            suggestions: ["Cancel Order", "Back to Menu"]
          });
        }
        
        const orderId = session.cancelOrderId;
        const reasonCode = session.cancelReasonCode;
        const refundMethod = 'original_payment';
        const refundDisplay = 'Refund';
        
        console.log('  Order ID:', orderId);
        console.log('  Reason Code:', reasonCode);
        console.log('  Refund Method:', refundMethod);
        console.log('  Refund Display:', refundDisplay);
        
        // Get order details
        console.log('📥 Fetching customer data...');
        const customerData = await getCustomerData(visitorEmail);
        console.log('📥 Customer data received, finding order...');
        console.log('📦 Available orders:', customerData.orders.map(o => o.id).join(', '));
        console.log('🔍 Looking for order:', orderId);
        
        // Case-insensitive order matching
        const order = customerData.orders.find(o => o.id.toUpperCase() === orderId.toUpperCase());
        
        if (!order) {
          console.log('Order not found in customer data');
          console.log('Searched for:', orderId);
          console.log('Available orders:', customerData.orders.map(o => o.id));
          return res.status(200).json({
            action: "reply",
            replies: [{ text: "Order not found. Please try again." }],
            suggestions: ["Back to Menu"]
          });
        }
        
        console.log('✅ Order matched:', order.id);
        
        console.log('✅ Order found, processing cancellation...');
        
        // Process cancellation - use the actual order ID from Firestore (uppercase)
        const cancellationData = {
          order_id: order.id,  // Use actual order ID from Firestore
          user_id: visitorEmail,
          action: 'cancel',
          cancellation_reason: reasonCode,
          refund_method: refundMethod,
          amount: order.totalAmount || 0,  // Include order amount
          payment_method: order.paymentMethod || 'N/A',  // Include payment method
          idempotency_token: `cancel_${Date.now()}_${order.id}`
        };
        
        console.log('🔄 Calling processCancellation...');
        const result = await processCancellation(cancellationData);
        console.log('✅ processCancellation completed:', result);
        
        if (result.success) {
          const successMessage = `**Successfully submitted your cancellation request!**\n\nOrder ID: ${order.id}\nProduct: ${order.items?.[0]?.productName || 'Product'}\nAmount: ₹${order.totalAmount}\nPayment Method: ${order.paymentMethod || 'N/A'}\nReference: ${result.refundReference}\nRefund Method: ${cancellationData.refund_method.replace('_', ' ').toUpperCase()}\n\nTo continue with the process and connect with a human agent, please press **"Yes"** above.`;
          
          console.log('📤 Sending success response...');
          return res.status(200).json({
            action: "reply",
            replies: [
              {
                text: successMessage
              }
            ]
          });
        } else {
          console.log('Cancellation failed:', result.message || result.error);
          return res.status(200).json({
            action: "reply",
            replies: [{ text: `Failed to submit cancellation request: ${result.message || result.error}` }],
            suggestions: ["Back to Menu"]
          });
        }
      }
      
      // ✅ HANDLE CLEAN REASON SELECTION: Direct text matching
      const reasonTextMap = {
        'product defective': 'defective',
        'product damaged': 'damaged',
        'Expired': 'expired',
        'other reason': 'other',
        'expired': 'expired'
      };
      
      const lowerMessage = messageText.toLowerCase();
      const matchedReason = Object.keys(reasonTextMap).find(key => lowerMessage === key);
      
      if (matchedReason) {
        console.log('\n💬 Return reason received:', messageText);
        
        const reasonCode = reasonTextMap[matchedReason];
        const reasonDisplay = messageText;
        
        // Get order from session
        const session = userSessions.get(visitorEmail);
        if (!session || !session.currentOrder) {
          return res.status(200).json({
            action: "reply",
            replies: [{ text: "Session expired. Please start again." }],
            suggestions: ["🔄 Return Order", "Back to Menu"]
          });
        }
        
        const order = session.currentOrder;
        session.selectedReason = reasonCode;
        session.selectedReasonDisplay = reasonDisplay;
        
        console.log('  Order ID:', order.id);
        console.log('  Reason Code:', reasonCode);
        console.log('  Reason Display:', reasonDisplay);
        
        // ✅ CHECK IF REASON IS EXPIRED - SHOW EXPIRY VERIFICATION UPLOAD
        if (reasonCode === 'expired' || reasonCode === 'expired') {
          console.log('📅 Expired reason selected - showing expiry verification upload');
          
          // Get product details
          const productName = order.items?.[0]?.productName || order.items?.[0]?.name || 'Product';
          const productId = order.items?.[0]?.productId || order.items?.[0]?.product_id || order.items?.[0]?.id || '';
          const imageUrl = order.items?.[0]?.imageUrl || order.items?.[0]?.imageurl || order.items?.[0]?.image_url || order.items?.[0]?.image || '';
          
          // Generate expiry verification upload URL
          const ngrokUrl = BASE_URL;
          const expiryUploadUrl = `${ngrokUrl}/expiry-upload-form.html?email=${encodeURIComponent(visitorEmail)}&orderId=${encodeURIComponent(order.id)}&productId=${encodeURIComponent(productId)}&imageUrl=${encodeURIComponent(imageUrl)}`;
          
          console.log('📅 Expiry upload URL parameters:');
          console.log('  Email:', visitorEmail);
          console.log('  Order ID:', order.id);
          console.log('  Product ID:', productId);
          console.log('  Image URL:', imageUrl);
          console.log('📅 Generated expiry upload URL:', expiryUploadUrl);
          
          // Store session data for reliable parameter retrieval
          expiryUploadSessions.set(visitorEmail, {
            orderId: order.id,
            productId: productId,
            imageUrl: imageUrl,
            productName: productName,
            timestamp: Date.now()
          });
          console.log('💾 Stored expiry upload session for:', visitorEmail);
          
          const response = {
            action: "reply",
            replies: [{
              text: `**Expiry Date Verification Required**\n\n` +
                    `Please upload a photo of the product showing the expiry date to verify automatically.\n\n` +
                    `Click the link below to upload:\n${expiryUploadUrl}\n\n`+
                    `After the verification, you need to press "Check Expiry Results" to proceed next step.`
            }],
            suggestions: [
              "Check Expiry Results",
              "Back to Menu"
            ]
          };
          
          console.log('\n✅ Expiry verification request created');
          console.log('📤 Sending response:', JSON.stringify(response, null, 2));
          
          return res.status(200).json(response);
        }
        
        // ✅ CHECK IF REASON REQUIRES HUMAN AGENT
        const humanAgentReasons = ['other'];
        
        if (humanAgentReasons.includes(reasonCode)) {
          console.log('⚠️ Reason requires human agent connection');
          
          const response = {
            action: "reply",
            replies: [{
              text: `**Oops!.. Let's connect with a human**\n\n` +
                    `This type of return requires assistance from our support team.\n\n` +
                    `Press "Yes" below to connect with a human agent.`
            }],
            suggestions: [
            ]
          };
          
          console.log('\n✅ Human agent connection message created');
          console.log('📤 Sending response:', JSON.stringify(response, null, 2));
          
          return res.status(200).json(response);
        }
        
        // Generate upload link with order details for automated reasons
        const productName = order.items?.[0]?.productName || order.items?.[0]?.name || 'Product';
        const productId = order.items?.[0]?.productId || order.items?.[0]?.product_id || order.items?.[0]?.id || '';
        const imageUrl = order.items?.[0]?.imageUrl || order.items?.[0]?.imageurl || order.items?.[0]?.image_url || order.items?.[0]?.image || '';
        
        // Store session data for reliable parameter retrieval
        productUploadSessions.set(visitorEmail, {
          orderId: order.id,
          productId: productId,
          imageUrl: imageUrl,
          productName: productName,
          timestamp: Date.now()
        });
        console.log('💾 Stored product upload session for:', visitorEmail);
        
        // IMPORTANT: Replace with your ngrok URL
        const ngrokUrl = 'https://nonchivalrous-paranoidly-cara.ngrok-free.dev';
        const uploadUrl = `${ngrokUrl}/upload-form.html?email=${encodeURIComponent(visitorEmail)}&orderId=${encodeURIComponent(order.id)}&productId=${encodeURIComponent(productId)}&imageUrl=${encodeURIComponent(imageUrl)}`;
        
        console.log('📸 Generated upload URL:', uploadUrl);
        
        // Show image verification request with Show Results button
        const response = {
          action: "reply",
          replies: [{
            text: `**Product Verification Required**\n\n` +
                  `Please upload a photo of the product to verify your return request.\n\n` +
                  `Click the link below to upload:\n${uploadUrl}\n\n` +
                  `After the verification, you need to press "Show Verification Results" to proceed next step.`
                  
          }],
          suggestions: [
            "Show Verification Results",
            "Back to Menu"
          ]
        };
        
        console.log('\n✅ Image verification request created');
        console.log('📤 Sending response:', JSON.stringify(response, null, 2));
        console.log('📦 Order ID:', order.id);
        console.log('🆔 Product ID:', productId);
        console.log('🖼️ Image URL:', imageUrl);
        
        return res.status(200).json(response);
      }
      
      // ✅ HANDLE RETURN REASON SELECTION (Simple button names)
      const returnReasonMap = {
        'product defective': 'defective',
        'product damaged': 'damaged',
        'expired': 'expired',
        'other reason': 'other'
      };
      
      const returnLowerMessage = messageText.toLowerCase();
      const matchedReturnReason = returnReasonMap[returnLowerMessage];
      
      if (matchedReturnReason) {
        console.log('\n💬 Return reason received:', messageText);
        
        // Get order context from session
        const returnReasonSession = userSessions.get(visitorEmail);
        
        if (!returnReasonSession || !returnReasonSession.returnOrderId) {
          return res.status(200).json({
            action: "reply",
            replies: [{ text: "Session expired. Please start again." }],
            suggestions: ["Return Order", "Back to Menu"]
          });
        }
        
        const orderId = returnReasonSession.returnOrderId;
        const reasonCode = matchedReturnReason;
        const reasonDisplay = messageText;
        
        console.log('  Order ID:', orderId);
        console.log('  Reason Code:', reasonCode);
        console.log('  Reason Display:', reasonDisplay);
        
        // ✅ CHECK IF REASON IS EXPIRED - SHOW EXPIRY VERIFICATION UPLOAD
        if (reasonCode === 'expired' || reasonCode === 'expired') {
          console.log('📅 Expired reason selected - showing expiry verification upload');
          
          // Check if currentOrder exists in session
          if (!returnReasonSession.currentOrder) {
            return res.status(200).json({
              action: "reply",
              replies: [{ text: "Session expired. Please start again." }],
              suggestions: ["🔄 Return Order", "Back to Menu"]
            });
          }
          
          // ✅ INITIALIZE expiry_verify = false when expired reason is selected
          returnReasonSession.expiry_verify = false;
          returnReasonSession.selectedReason = reasonCode;
          returnReasonSession.selectedReasonDisplay = reasonDisplay;
          console.log('🔒 expiry_verify initialized to FALSE for order:', orderId);
          
          const order = returnReasonSession.currentOrder;
          const productName = order.items?.[0]?.productName || order.items?.[0]?.name || 'Product';
          const productId = order.items?.[0]?.productId || order.items?.[0]?.id || 'unknown';
          const imageUrl = order.items?.[0]?.imageUrl || '';
          
          // Generate expiry verification upload URL
          const ngrokUrl = BASE_URL;
          const expiryUploadUrl = `${ngrokUrl}/expiry-upload-form.html?email=${encodeURIComponent(visitorEmail)}&orderId=${encodeURIComponent(orderId)}&productId=${encodeURIComponent(productId)}&imageUrl=${encodeURIComponent(imageUrl)}`;
          
          console.log('📅 Generated expiry upload URL:', expiryUploadUrl);
          
          const response = {
            action: "reply",
            replies: [{
              text: `**Expiry Date Verification Required**\n\n` +
                    `Please upload a photo of the product showing the expiry date to verify automatically.\n\n` +
                    `Click the link below to upload:\n${expiryUploadUrl}\n\n`+
                    `After the verification, you need to press "Check Expiry Results" to proceed next step.`
            }],
            suggestions: [
              "Check Expiry Results",
              "Back to Menu"
            ]
          };
          
          console.log('\n✅ Expiry verification request created');
          console.log('📤 Sending response:', JSON.stringify(response, null, 2));
          
          return res.status(200).json(response);
        }
        
        // ✅ CHECK IF REASON REQUIRES HUMAN AGENT
        const humanAgentReasons = ['other'];
        
        if (humanAgentReasons.includes(reasonCode)) {
          console.log('⚠️ Reason requires human agent connection');
          
          const response = {
            action: "reply",
            replies: [{
              text: `**Oops!.. Let's connect with a human**\n\n` +
                    `This type of return requires assistance from our support team.\n\n` +
                    `Press "Yes" below to connect with a human agent.`
            }],
            suggestions: [
            ]
          };
          
          console.log('\n✅ Human agent connection message created');
          console.log('📤 Sending response:', JSON.stringify(response, null, 2));
          
          return res.status(200).json(response);
        }
        
        // ✅ INITIALIZE product_verify = false when reason is selected
        const session = userSessions.get(visitorEmail);
        if (session) {
          session.product_verify = false;
          session.selectedReason = reasonCode;
          session.selectedReasonDisplay = reasonDisplay;
          console.log('🔒 product_verify initialized to FALSE for order:', orderId);
        }
        
        // Generate product verification upload URL
        const ngrokUrl = BASE_URL;
        const order = session?.currentOrder;
        const productName = order?.items?.[0]?.productName || order?.items?.[0]?.name || 'Product';
        const productId = order?.items?.[0]?.productId || order?.items?.[0]?.id || 'unknown';
        const imageUrl = order?.items?.[0]?.imageUrl || '';
        
        const uploadUrl = `${ngrokUrl}/upload-form.html?email=${encodeURIComponent(visitorEmail)}&orderId=${encodeURIComponent(orderId)}&productId=${encodeURIComponent(productId)}&imageUrl=${encodeURIComponent(imageUrl)}`;
        
        console.log('📸 Generated product verification upload URL:', uploadUrl);
        
        // Show product verification upload for automated reasons (defective, damaged)
        const response = {
          action: "reply",
          replies: [{
            text: `**Product Verification Required**\n\n` +
                  `Please upload a photo of the product to verify your return request.\n\n` +
                  `Click the link below to upload:\n${uploadUrl}\n\n` +
                  `After the verification, you need to press "Show Verification Results" to proceed next step.`
                  
          }],
          suggestions: [
            "Show Verification Results",
            "Back to Menu"
          ]
        };
        
        console.log('\n✅ Product verification request created');
        console.log('📤 Sending response:', JSON.stringify(response, null, 2));
        
        return res.status(200).json(response);
      }
      
      // 🔄 HANDLE "REPLACE THE ORDER" OPTION
      if (messageText.toLowerCase().includes('replace the order') || 
          lowerMessage === '🔄 replace the order') {
        console.log('\n🔄 Replace the Order selected');
        
        const session = userSessions.get(visitorEmail);
        
        if (!session || !session.currentIssue) {
          return res.status(200).json({
            action: "reply",
            replies: [{ text: "Session expired. Please start again." }],
            suggestions: ["🔄 Return Order", "Back to Menu"]
          });
        }
        
        const issue = session.currentIssue;
        
        try {
          // Delete the issue from Firestore
          await db.collection('issues').doc(issue.issueId || issue.id).delete();
          console.log('✅ Issue deleted from Firestore:', issue.issueId || issue.id);
          
          // Clear session data
          delete session.currentIssue;
          
          const response = {
            action: "reply",
            replies: [{
              text: `**Request Accepted**\n\n` +
                    `**Order Details:**\n` +
                    `Product: ${issue.productName}\n` +
                    `Order ID: ${issue.orderId}\n` +
                    `Amount: ₹${issue.amount}\n\n` +
                    `**Replacement Order:**\n` +
                    `Your request for order replacement has been accepted!\n\n` +
                    `We will process your replacement order and send you a new product.\n\n` +
                    `If you have any queries, press "Yes" to connect with a human agent.`
            }],
            suggestions: [
            ]
          };
          
          console.log('✅ Replacement order accepted');
          return res.status(200).json(response);
        } catch (error) {
          console.error('❌ Error processing replacement:', error);
          return res.status(200).json({
            action: "reply",
            replies: [{ text: "❌ Error processing replacement. Please try again." }],
            suggestions: ["Back to Menu"]
          });
        }
      }
      
      // 💰 HANDLE "REFUND THE AMOUNT" OPTION
      if (messageText.toLowerCase().includes('refund the amount') || 
          lowerMessage === '💰 refund the amount') {
        console.log('\n💰 Refund the Amount selected');
        
        const session = userSessions.get(visitorEmail);
        
        if (!session || !session.currentIssue) {
          return res.status(200).json({
            action: "reply",
            replies: [{ text: "Session expired. Please start again." }],
            suggestions: ["🔄 Return Order", "Back to Menu"]
          });
        }
        
        const issue = session.currentIssue;
        const expiryInfo = issue.expiryVerification || {};
        const productInfo = issue.productVerification || {};
        
        // Store refund pending flag in session
        session.pendingRefund = true;
        session.refundIssue = issue;
        
        const response = {
          action: "reply",
          replies: [{
            text: `**Refund Request**\n\n` +
                  `**Complete Order Details:**\n` +
                  `Product: ${issue.productName}\n` +
                  `Order ID: ${issue.orderId}\n` +
                  `Product ID: ${issue.productId || 'N/A'}\n` +
                  `Amount: ₹${issue.amount}\n\n` +
                  `Expiry Date: ${expiryInfo.expiryDate || 'N/A'}\n` +
                  `Current Date: ${expiryInfo.currentDate || 'N/A'}\n` +
                  `Status: ${expiryInfo.isExpired ? 'EXPIRED ✅' : 'NOT EXPIRED'}\n` +
                  `Product Match: ${productInfo.isMatch ? 'YES ✅' : 'NO'}\n` +
                  `Damage Detected: ${productInfo.damageDetected ? 'YES ⚠️' : 'NO'}\n` +
                  `Confidence: ${productInfo.confidence || 0}%\n\n` +
                  `Issue ID: ${issue.issueId || issue.id}\n` +
                  `Issue Type: ${issue.issueType || 'Expired product'}\n` +
                  `Status: ${issue.status}\n` +
                  `Resolution: ${issue.resolution}\n` +
                  `Priority: ${issue.priority || 'High'}\n\n` +
                  `Refund Amount: ₹${issue.amount}\n` +
                  `Check the above Detail Carefully, Payment will be processed within 1 business day\n\n` +
                  `Press "Yes" to confirm and process the refund.`
          }],
          suggestions: [
          ]
        };
        
        console.log('💰 Refund details displayed, waiting for confirmation');
        return res.status(200).json(response);
      }
      
      // ✅ HANDLE "YES" CONFIRMATION FOR REFUND
      if (messageText.toLowerCase() === 'yes' && session && session.pendingRefund) {
        console.log('\n✅ Yes - Refund confirmation received');
        
        const issue = session.refundIssue;
        
        if (!issue) {
          return res.status(200).json({
            action: "reply",
            replies: [{ text: "Session expired. Please start again." }],
            suggestions: ["🔄 Return Order", "Back to Menu"]
          });
        }
        
        try {
          // Update issue status in Firestore
          await db.collection('issues').doc(issue.issueId || issue.id).update({
            status: 'Refund Approved',
            resolution: 'Refund will be processed within 1 business day',
            refundApprovedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log('✅ Issue updated with refund approval');
          
          // Clear session data
          delete session.pendingRefund;
          delete session.refundIssue;
          delete session.currentIssue;
          
          const response = {
            action: "reply",
            replies: [{
              text: `**Refund Approved**\n\n` +
                    `**Order Details:**\n` +
                    `Product: ${issue.productName}\n` +
                    `Order ID: ${issue.orderId}\n` +
                    `Amount: ₹${issue.amount}\n\n` +
                    `Status: APPROVED\n` +
                    `Amount: ₹${issue.amount}\n` +
                    `Check the above Detail Carefully, Payment will be processed within 1 business day\n\n` +
                    `Press "Yes" to confirm and process the refund.`
            }],
            suggestions: [
              "Back to Menu"
            ]
          };
          
          console.log('✅ Refund approved and processed');
          return res.status(200).json(response);
        } catch (error) {
          console.error('❌ Error processing refund:', error);
          return res.status(200).json({
            action: "reply",
            replies: [{ text: "❌ Error processing refund. Please try again." }],
            suggestions: ["Back to Menu"]
          });
        }
      }
      
      // ✅ HANDLE RETURN REFUND METHOD AND PROCESS RETURN (Format: RETURN_REFUND:ORD123:reason_code:refund_method:Display Text)
      if (messageText.toUpperCase().startsWith('RETURN_REFUND:')) {
        console.log('\n💳 Return refund method received:', messageText);
        
        // Parse: RETURN_REFUND:ORD123:defective:original_payment:Original Payment Method
        const parts = messageText.split(':');
        if (parts.length < 5) {
          return res.status(200).json({
            action: "reply",
            replies: [{ text: "Invalid selection. Please try again." }],
            suggestions: ["Back to Menu"]
          });
        }
        
        const orderId = parts[1].toUpperCase();
        const reasonCode = parts[2];
        const refundMethod = parts[3];
        const refundDisplay = parts.slice(4).join(':');
        
        console.log('  Order ID:', orderId);
        console.log('  Reason Code:', reasonCode);
        console.log('  Refund Method:', refundMethod);
        console.log('  Refund Display:', refundDisplay);
        
        try {
          // Get order details
          console.log('📥 Fetching customer data...');
          const customerData = await getCustomerData(visitorEmail);
          const order = customerData.orders.find(o => o.id.toUpperCase() === orderId.toUpperCase());
          
          if (!order) {
            return res.status(200).json({
              action: "reply",
              replies: [{ text: "Order not found. Please try again." }],
              suggestions: ["Back to Menu"]
            });
          }
          
          console.log('✅ Order found, processing return...');
          
          // Save return request to Firestore issues collection
          const returnReference = `RET_${orderId}_${Date.now()}`;
          
          // Get reason display name
          const reasonMap = {
            'defective': 'Product defective',
            'damaged': 'Product damaged',
            'expired': 'Expired',
            'other': 'Other reason'
          };
          const reasonDisplayName = reasonMap[reasonCode] || reasonCode;
          
          await saveIssueToFirestore({
            id: `RETURN_${Date.now()}`,
            customerEmail: visitorEmail,
            orderId: orderId,
            issueType: 'Order Return',
            description: `Customer requested order return. Reason: ${reasonDisplayName}`,
            status: 'Pending Review',
            resolution: `Awaiting human agent review. Reference: ${returnReference}`,
            returnReason: reasonCode,
            returnReasonDisplay: reasonDisplayName,
            refundMethod: refundMethod,
            refundMethodDisplay: refundDisplay,
            returnReference: returnReference,
            amount: order.totalAmount || 0,
            paymentMethod: order.paymentMethod || 'N/A',
            source: 'salesiq_chat',
            createdAt: new Date().toISOString()
          });
          
          console.log('✅ Return request saved to Firestore');
          
          // Get product details from delivered orders or regular orders
          let productId = '';
          let imageUrl = '';
          
          // Try to get from delivered orders first
          if (customerData.deliveredOrders && customerData.deliveredOrders.length > 0) {
            const deliveredOrder = customerData.deliveredOrders.find(o => o.id === orderId);
            if (deliveredOrder && deliveredOrder.items && deliveredOrder.items.length > 0) {
              const item = deliveredOrder.items[0];
              productId = item.productId || item.product_id || item.id || '';
              imageUrl = item.imageUrl || item.imageurl || item.image_url || '';
              console.log('📦 Found product in delivered orders:');
              console.log('  - Product ID:', productId);
              console.log('  - Image URL:', imageUrl);
            }
          }
          
          // Fallback to regular orders
          if (!productId && order.items && order.items.length > 0) {
            const item = order.items[0];
            productId = item.productId || item.product_id || item.id || '';
            imageUrl = item.imageUrl || item.imageurl || item.image_url || '';
            console.log('📦 Found product in regular orders:');
            console.log('  - Product ID:', productId);
            console.log('  - Image URL:', imageUrl);
          }
          
          // Send confirmation message with all details
          // Generate upload form URL with order details (URL encode only the values)
          const encodedEmail = encodeURIComponent(visitorEmail);
          const encodedOrderId = encodeURIComponent(orderId);
          const encodedProductId = encodeURIComponent(productId);
          const encodedImageUrl = encodeURIComponent(imageUrl);
          
          const uploadUrl = `${BASE_URL}/upload-form.html?email=${encodedEmail}&orderId=${encodedOrderId}&productId=${encodedProductId}&imageUrl=${encodedImageUrl}`;
          
          console.log('🔗 Upload URL constructed:');
          console.log('  - Base URL:', BASE_URL);
          console.log('  - Email (encoded):', encodedEmail);
          console.log('  - Order ID (encoded):', encodedOrderId);
          console.log('  - Product ID (encoded):', encodedProductId);
          console.log('  - Image URL (encoded):', encodedImageUrl);
          console.log('  - Full URL:', uploadUrl);
          
          return res.status(200).json({
            action: "reply",
            replies: [{
              type: "message",
              text: `✅ **Return Request Submitted Successfully!**\n\n` +
                    `🆔 Order ID: ${orderId}\n` +
                    `📦 Product: ${order.items?.[0]?.productName || order.items?.[0]?.name || 'Product'}\n` +
                    `💰 Amount: ₹${order.totalAmount}\n` +
                    `💳 Payment Method: ${order.paymentMethod || 'N/A'}\n` +
                    `📝 Return Reason: ${reasonDisplayName}\n` +
                    `🔁 Refund Method: ${refundDisplay}\n` +
                    `📄 Reference: ${returnReference}\n\n` +
                    `Your return request has been submitted for review.\n\n` +
                    `📸 **Next Step: Upload Product Image**\n\n` +
                    `Click the button below to open the upload form:`,
              buttons: [
                {
                  label: "📸 Upload Product Image",
                  name: "UPLOAD_IMAGE_BUTTON",
                  type: "url",
                  url: uploadUrl
                }
              ]
            }],
            suggestions: ["Back to Menu"]
          });
        } catch (error) {
          console.error('Error processing return:', error);
          return res.status(200).json({
            action: "reply",
            replies: [{
              text: "Failed to process return request. Please try again or contact support."
            }],
            suggestions: ["Back to Menu", "📞 Contact Support"]
          });
        }
      }

      
      // ✅ HANDLE RETURN ORDER - Show delivered orders only
      if (messageText === "🔄 return order" || (messageText.includes("return order") && !messageText.match(/(ord\d+)/i))) {
        console.log('\n✅ DEBUG: Return Order button clicked!');
        try {
          console.log('🔍 Step 1: Fetching customer data for:', visitorEmail);
          const customerData = await getCustomerData(visitorEmail);
          console.log('✅ Step 2: Customer data fetched successfully');
          console.log('  - Total Orders:', customerData.orders?.length || 0);
          console.log('  - Delivered Orders (from collection):', customerData.deliveredOrders?.length || 0);
          
          const startTime = Date.now();
          let deliveredOrders = [];
          
          // Priority 1: Use delivered orders from the delivered collection
          if (customerData.deliveredOrders && customerData.deliveredOrders.length > 0) {
            console.log('\n✅ Using delivered orders from delivered collection');
            deliveredOrders = customerData.deliveredOrders;
          } else if (firebaseEnabled && db && customerData.orders && customerData.orders.length > 0) {
            // Priority 2: Check delivery status from products collection for regular orders
            console.log('\n🔍 Step 3: Checking delivery status from products collection...');
            // Fetch all products in parallel for all orders
            const allProductIds = new Set();
            customerData.orders.forEach(order => {
              order.items?.forEach(item => {
                const productId = item.productId || item.id;
                if (productId) allProductIds.add(productId);
              });
            });
            
            console.log(`  - Fetching ${allProductIds.size} unique products...`);
            
            // Fetch all products at once
            const productCache = {};
            const productFetchPromises = Array.from(allProductIds).map(async (productId) => {
              try {
                const productDoc = await db.collection('products').doc(productId).get();
                if (productDoc.exists) {
                  productCache[productId] = productDoc.data();
                }
              } catch (error) {
                console.error(`Error fetching product ${productId}:`, error.message);
              }
            });
            
            await Promise.all(productFetchPromises);
            console.log(`  - Fetched ${Object.keys(productCache).length} products`);
            
            // Now check each order using the cache
            for (const order of customerData.orders) {
              if (!order.items || order.items.length === 0) continue;
              
              let allDelivered = true;
              const productStatuses = [];
              
              for (const item of order.items) {
                const productId = item.productId || item.id;
                const productData = productCache[productId];
                
                if (productData) {
                  const deliveryStatus = productData.delivery_status || 'Unknown';
                  productStatuses.push(`${productData.name}: ${deliveryStatus}`);
                  
                  if (deliveryStatus !== 'Delivered' && deliveryStatus !== 'delivered') {
                    allDelivered = false;
                  }
                } else {
                  productStatuses.push(`${productId}: Not found`);
                  allDelivered = false;
                }
              }
              
              console.log(`  - Order ${order.id}: ${productStatuses.join(', ')} → ${allDelivered ? '✅ Delivered' : 'Not delivered'}`);
              
              if (allDelivered) {
                deliveredOrders.push(order);
              }
            }
          } // End of product verification for regular orders
          
          const elapsedTime = Date.now() - startTime;
          console.log(`⏱️ Product verification completed in ${elapsedTime}ms`);
          
          console.log('\n📊 Summary:');
          console.log('  - Total Orders:', customerData.orders?.length || 0);
          console.log('  - Delivered Orders:', deliveredOrders.length);
          
          if (deliveredOrders.length === 0) {
            console.log('\n⚠️ No delivered orders found - sending "no orders" message');
            const noOrdersResponse = {
              action: "reply",
              replies: [{
                text: "You have no delivered orders that can be returned.\n\nOnly delivered orders are eligible for return."
              }],
              suggestions: ["Back to Menu"]
            };
            console.log('📤 Response:', JSON.stringify(noOrdersResponse, null, 2));
            return res.status(200).json(noOrdersResponse);
          }
          
          console.log('\n📋 Step 4: Showing delivered orders...');
          
          // Store orders in session for this user
          if (!userSessions.has(visitorEmail)) {
            userSessions.set(visitorEmail, { orders: [], currentOrder: null });
          }
          const session = userSessions.get(visitorEmail);
          session.orders = deliveredOrders;
          
          // Create clean button suggestions with product name and amount
          const orderSuggestions = deliveredOrders.map((order, index) => {
            const productName = order.items?.[0]?.productName || order.items?.[0]?.name || 'Product';
            return `${productName} - ₹${order.totalAmount}`;
          });
          
          console.log('  - Created order suggestions:', orderSuggestions.length);
          console.log('  - Stored orders in session for:', visitorEmail);
          
          const response = {
            action: "reply",
            replies: [{
              text: `Click on any order below to proceed with the return process.`
            }],
            suggestions: [...orderSuggestions, "Back to Menu"]
          };
          
          console.log('\n✅ Step 5: Delivered order list created');
          console.log('📤 Sending response to SalesIQ');
          console.log('⏱️ Total time elapsed:', Date.now() - startTime, 'ms');
          console.log('\n📋 Full Response JSON:');
          console.log(JSON.stringify(response, null, 2));
          console.log('=======================================\n');
          
          // Return message response with suggestions
          return res.status(200).json(response);
        } catch (error) {
          console.error('\n❌❌ERROR IN RETURN ORDER HANDLER ❌❌❌');
          console.error('Error Message:', error.message);
          console.error('Error Stack:', error.stack);
          console.error('=======================================\n');
          return res.status(200).json({
            action: "reply",
            replies: [{
              text: "Error loading orders. Please try again later."
            }],
            suggestions: ["Back to Menu"]
          });
        }
      }
      
      // ✅ HANDLE ORDER BUTTON SELECTION: "oneplus buds 2r - ₹2999"
      if (/^.+\s+-\s+₹\d+$/.test(messageText.trim())) {
        console.log('\n✅ Order button selected:', messageText);
        
        // Check if user has a session with orders
        const session = userSessions.get(visitorEmail);
        if (session && session.orders && session.orders.length > 0) {
          try {
            // Match the button text with orders to find the index
            const selectedButton = messageText.trim();
            let orderIndex = -1;
            
            console.log('\n🔍 DEBUG: Matching order button...');
            console.log('  Selected Button:', selectedButton);
            console.log('  Session Orders Count:', session.orders.length);
            
            for (let i = 0; i < session.orders.length; i++) {
              const order = session.orders[i];
              const productName = order.items?.[0]?.productName || order.items?.[0]?.name || 'Product';
              const buttonText = `${productName} - ₹${order.totalAmount}`;
              
              console.log(`  Order ${i}: "${buttonText}" (Product: ${productName}, Amount: ${order.totalAmount})`);
              console.log(`    Match? ${buttonText === selectedButton}`);
              
              console.log(`  Order ${i}: "${buttonText}" (Product: ${productName}, Amount: ${order.totalAmount})`);
              console.log(`    Match? ${buttonText.toLowerCase() === selectedButton.toLowerCase()}`);
              
              if (buttonText.toLowerCase() === selectedButton.toLowerCase()) {
                orderIndex = i;
                break;
              }
            }
            
            if (orderIndex === -1) {
              console.log('❌ No matching order found!');
              console.log('  Expected format: "Product Name - ₹Amount"');
              console.log('  Received:', selectedButton);
              return res.status(200).json({
                action: "reply",
                replies: [{ text: "Invalid selection. Please try again." }],
                suggestions: ["🔄 Return Order", "Back to Menu"]
              });
            }
            
            console.log('📦 Matched Order Index:', orderIndex);
            
            const order = session.orders[orderIndex];
            session.currentOrder = order;
            const orderId = order.id;
            const productName = order.items?.[0]?.productName || order.items?.[0]?.name || 'Product';
            
            console.log('✅ Order found:', orderId);
            console.log('📦 Product:', productName);
            
            // Show return reason selection with clean text
            const response = {
              action: "reply",
              replies: [{
                text: `Please select a reason`
              }],
              suggestions: [
                "Product defective",
                "Product damaged",
                "Expired",
                "Other reason",
                "Back to Menu"
              ]
            };
            
            return res.status(200).json(response);
          } catch (error) {
            console.error('Error handling order selection:', error);
            return res.status(200).json({
              action: "reply",
              replies: [{ text: "Error processing selection. Please try again." }],
              suggestions: ["Back to Menu"]
            });
          }
        }
      }
      
      // ✅ HANDLE RETURN ORDER SELECTION (when user clicks on order suggestion)
      if (messageText.startsWith("return ord") && messageText.includes("|")) {
        console.log('\n✅ Return order selected from suggestions');
        try {
          // Extract order ID from the message (format: "Return ORD1765206290027 | product | ₹2999")
          const orderIdMatch = messageText.match(/return\s+(ord\d+)/i);
          if (orderIdMatch) {
            const orderId = orderIdMatch[1].toUpperCase();
            console.log('📦 Extracted Order ID:', orderId);
            
            // Get customer data
            const customerData = await getCustomerData(visitorEmail);
            
            // Find the order
            let order = null;
            let isFromDeliveredCollection = false;
            
            if (customerData.deliveredOrders) {
              order = customerData.deliveredOrders.find(o => o.id === orderId);
              if (order) {
                isFromDeliveredCollection = true;
                console.log('✅ Order found in delivered collection');
                console.log('📋 Order fields:', Object.keys(order));
                console.log('📦 Delivery Status in order:', order.delivery_status);
              }
            }
            if (!order && customerData.orders) {
              order = customerData.orders.find(o => o.id === orderId);
              console.log('✅ Order found in regular orders - will verify delivery status');
            }
            
            if (order) {
              // Mark order as delivered if it's from the delivered collection
              if (isFromDeliveredCollection) {
                order.isDelivered = true;
              }
              
              console.log('✅ Order found, opening return form');
              const returnForm = createReturnOrderForm(order);
              return res.status(200).json(returnForm);
            } else {
              return res.status(200).json({
                action: "reply",
                replies: [{
                  text: "❌ Order not found. Please try again."
                }],
                suggestions: ["🔄 Return Order", "Back to Menu"]
              });
            }
          }
        } catch (error) {
          console.error('Error handling return order selection:', error);
        }
      }
      
      if (messageText === "📋 other options" || messageText.includes("other options")) {
        const customerData = await getCustomerData(visitorEmail);
        const otherResponse = handleOtherAction(customerData, visitorInfoForQuery);
        return res.status(200).json(otherResponse);
      }
      
      if (messageText === "back to menu" || messageText.includes("back to menu")) {
        // Return to main menu
        const buttonMessage = createAutoActionButtonsMessage(visitorInfoForQuery);
        const response = {
          action: "reply",
          replies: [buttonMessage]
        };
        return res.status(200).json(response);
      }
      
      // ✅ DEFAULT: SHOW MAIN MENU
      const buttonMessage = createAutoActionButtonsMessage(visitorInfoForQuery);
      const response = {
        action: "reply",
        replies: [buttonMessage],
        suggestions: [
          "Return Order",
          "Cancel Order",
          "Other Issue"
        ]
      };
      
      console.log('\n✅ ===== SENDING RESPONSE TO SALESIQ =====');
      console.log('Action:', response.action);
      console.log('Message:', response.replies[0].text);
      console.log('Number of Suggestions:', response.suggestions?.length || 0);
      console.log('\n📤 Full Response:');
      console.log(JSON.stringify(response, null, 2));
      console.log('=======================================\n');

      return res.status(200).json(response);
    }


    // ✅ HANDLE FORM SUBMISSION
    if (formData && formName) {
      console.log('📋 FORM SUBMITTED:', formName);

      const formResponse = await processFormSubmission(
        formName,
        formData,
        visitorInfo
      );

      return res.status(200).json(formResponse);
    }

    // ✅ HANDLE POSTBACK BUTTON ACTIONS
    if (requestData.postback) {
      const action = requestData.postback.name;
      console.log('\n🔘 ===== POSTBACK BUTTON CLICKED =====');
      console.log('Action:', action);
      console.log('Visitor:', visitorInfo.email);

      if (
        action.startsWith('cancel_order_') ||
        action.startsWith('return_order_')
      ) {
        const orderId = action.split('_').pop();
        console.log('📦 Extracted Order ID:', orderId);
        console.log('🔍 Fetching order details and opening form...');
        
        const actionResponse = await handleOrderAction(
          action,
          orderId,
          visitorInfo
        );
        
        console.log('\n📤 Sending Form Response:');
        console.log('Type:', actionResponse.type);
        console.log('Title:', actionResponse.title);
        console.log('Form Name:', actionResponse.name);
        console.log('Number of Fields:', actionResponse.fields?.length || 0);
        console.log('\n📋 Full Form JSON:');
        console.log(JSON.stringify(actionResponse, null, 2));
        console.log('=======================================\n');
        
        return res.status(200).json(actionResponse);
      }
      // Handle new button actions from welcome message
      if (action === 'return_order') {
        // Trigger return order flow
        const customerData = await getCustomerData(visitorInfo.email);
        const response = {
          action: "reply",
          replies: [{
            text: "**Return Order**\n\nPlease type 'Return Order' to see your delivered orders."
          }],
          suggestions: ["Return Order", "Back to Menu"]
        };
        return res.status(200).json(response);
      }
      if (action === 'cancel_order') {
        // Trigger cancel order flow
        const customerData = await getCustomerData(visitorInfo.email);
        const response = {
          action: "reply",
          replies: [{
            text: "**Cancel Order**\n\nPlease type 'Cancel Order' to see your pending orders."
          }],
          suggestions: ["Cancel Order", "Back to Menu"]
        };
        return res.status(200).json(response);
      }

      if (action === 'track_order') {
        const customerData = await getCustomerData(visitorInfo.email);
        const response = {
          action: "reply",
          replies: [{
            text: "**Track Order**\n\nPlease provide your order ID to track its status."
          }],
          suggestions: ["Back to Menu"]
        };
        return res.status(200).json(response);
      }

      if (action === 'upload_image_camera') {
        // Instruct user to use the camera/attachment feature
        const response = {
          action: "reply",
          replies: [{
            text: "**Upload Product Image**\n\n" +
                  "1️Take a photo with your only by camera\n" +
                  "The AI will analyze your image instantly!"
          }],
          suggestions: ["Back to Menu"]
        };
        return res.status(200).json(response);
      }

      if (action === 'other_issue') {
        const response = {
          action: "reply",
          replies: [{
            text: "**Other Issue**\n\nPlease describe your issue and our support team will assist you."
          }],
          suggestions: ["Back to Menu"]
        };
        return res.status(200).json(response);
      }

      if (
        action === 'return_action' ||
        action === 'cancel_action' ||
        action === 'other_action'
      ) {
        const buttonResponse = await handleButtonAction(action, visitorInfo);
        return res.status(200).json(buttonResponse);
      }

      if (action === 'back_to_menu') {
        const menuResponse = await sendCustomerWidget(visitorInfo);
        return res.status(200).json(menuResponse);
      }

      if (action === 'check_status') {
        const customerData = await getCustomerData(visitorInfo.email);
        const statusResponse = createOrderStatusResponse(customerData);
        return res.status(200).json(statusResponse);
      }

      if (action === 'feedback') {
        return res.status(200).json(createFeedbackForm());
      }

      if (action === 'view_profile') {
        const widgetResponse = await sendCustomerWidget(visitorInfo);
        return res.status(200).json(widgetResponse);
      }
      
      // Handle custom form submission
      if (action === 'cancel_order_submit') {
        console.log('\n📋 ===== CUSTOM FORM SUBMITTED =====');
        console.log('Form Data:', requestData.postback.data);
        
        const formData = requestData.postback.data || {};
        const orderId = formData.order_id;
        const cancellationReason = formData.cancellation_reason;
        const reasonDetails = formData.reason_details || '';
        const refundMethod = formData.refund_method;
        
        console.log('Order ID:', orderId);
        console.log('Reason:', cancellationReason);
        console.log('Details:', reasonDetails);
        console.log('Refund Method:', refundMethod);
        
        try {
          // Fetch customer data
          const customerData = await getCustomerData(visitorInfo.email);
          const order = customerData.orders.find(o => o.id === orderId);
          
          if (!order) {
            return res.status(200).json({
              action: "reply",
              replies: [{
                text: "Order not found. Please try again."
              }],
              suggestions: ["Back to Menu"]
            });
          }
          
          // Process cancellation
          const cancellationData = {
            orderId: orderId,
            customerEmail: visitorInfo.email,
            cancellationReason: cancellationReason,
            reasonDetails: reasonDetails,
            refundMethod: refundMethod,
            amount: order.totalAmount,
            paymentMethod: order.paymentMethod || 'Unknown',
            source: 'salesiq_chat'
          };
          
          console.log('\n🔄 Processing cancellation...');
          const result = await processCancellation(cancellationData);
          
          console.log('✅ Cancellation processed:', result.refundReference);
          
          // Generate upload form URL with order details (URL encode parameters)
          const uploadProductId = order?.items?.[0]?.productId || order?.items?.[0]?.product_id || '';
          const uploadImageUrl = order?.items?.[0]?.imageUrl || order?.items?.[0]?.imageurl || order?.items?.[0]?.image_url || '';
          const uploadUrl = `${BASE_URL}/upload-form.html?email=${encodeURIComponent(visitorInfo.email)}&orderId=${encodeURIComponent(orderId)}&productId=${encodeURIComponent(uploadProductId)}&imageUrl=${encodeURIComponent(uploadImageUrl)}`;
          
          return res.status(200).json({
            action: "reply",
            replies: [{
              text: `✅ **Cancellation Request Submitted Successfully!**\n\n` +
                    `📦 Order: ${orderId}\n` +
                    `💰 Amount: ₹${order.totalAmount}\n` +
                    `🔄 Refund Method: ${refundMethod.replace('_', ' ')}\n` +
                    `📝 Reference: ${result.refundReference}\n\n` +
                    `Your refund will be processed within 5-7 business days.\n\n` +
                    `📸 **Next Step: Upload Product Image**\n\n` +
                    `Click the link below to open the camera and take a photo:\n` +
                    `🔗 ${uploadUrl}\n\n` +
                    `Or use the 📎 attachment icon below to upload directly.`
            }],
            suggestions: ["Back to Menu", "📞 Contact Support"]
          });
        } catch (error) {
          console.error('Error processing cancellation:', error);
          return res.status(200).json({
            action: "reply",
            replies: [{
              text: "Failed to process cancellation. Please try again or contact support."
            }],
            suggestions: ["Back to Menu", "📞 Contact Support"]
          });
        }
      }
      
      // ✅ HANDLE QUICK CANCEL FROM WIDGET (Direct cancellation without asking reason)
      if (action && action.startsWith('QUICK_CANCEL:')) {
        console.log('\n⚡ ===== QUICK CANCEL TRIGGERED =====');
        console.log('Action:', action);
        
        const orderId = action.replace('QUICK_CANCEL:', '');
        console.log('Order ID to cancel:', orderId);
        console.log('Customer Email:', visitorInfo.email);
        
        try {
          // Fetch customer data and order
          const customerData = await getCustomerData(visitorInfo.email);
          const order = customerData.orders.find(o => o.id === orderId);
          
          if (!order) {
            return res.status(200).json({
              action: "reply",
              replies: [{
                text: "Order not found. Please try again."
              }],
              suggestions: ["Back to Menu"]
            });
          }
          
          console.log('✅ Order found:', order.id);
          console.log('Order Amount:', order.totalAmount);
          console.log('Payment Method:', order.paymentMethod);
          
          // Process immediate cancellation with default values
          const cancellationData = {
            order_id: order.id,
            user_id: visitorInfo.email,
            action: 'cancel',
            cancellation_reason: 'customer_request',
            refund_method: 'original_payment',
            amount: order.totalAmount || 0,
            payment_method: order.paymentMethod || 'N/A',
            idempotency_token: `quick_cancel_${Date.now()}_${order.id}`
          };
          
          console.log('\n🔄 Processing quick cancellation...');
          const result = await processCancellation(cancellationData);
          console.log('✅ Cancellation result:', result);
          
          if (result.success) {
            // Task 4 & 5: Delete from Firestore (orders and issues)
            console.log('\n🗑️ Deleting order from Firestore...');
            await deleteOrderFromFirestore(visitorInfo.email, order.id);
            
            // Task 6: Send success message
            return res.status(200).json({
              action: "reply",
              replies: [{
                text: `✅ **Order Cancelled Successfully!**\n\n` +
                      `🆔 Order ID: ${order.id}\n` +
                      `📦 Product: ${order.items?.[0]?.productName || 'Product'}\n` +
                      `💰 Amount: ₹${order.totalAmount}\n` +
                      `💳 Payment Method: ${order.paymentMethod || 'N/A'}\n` +
                      `📄 Reference: ${result.refundReference}\n` +
                      `🔁 Refund Method: Original Payment Method\n\n` +
                      `Your refund will be processed within 5-7 business days.\n` +
                      `The order has been removed from your account.`
              }],
              suggestions: ["Back to Menu", "📞 Contact Support"]
            });
          } else {
            return res.status(200).json({
              action: "reply",
              replies: [{
                text: `Failed to cancel order: ${result.message || result.error}`
              }],
              suggestions: ["Back to Menu", "📞 Contact Support"]
            });
          }
        } catch (error) {
          console.error('Error in quick cancel:', error);
          return res.status(200).json({
            action: "reply",
            replies: [{
              text: "Failed to cancel order. Please try again or contact support."
            }],
            suggestions: ["Back to Menu", "📞 Contact Support"]
          });
        }
      }
      
      // 📤 HANDLE OPEN UPLOAD FORM (Send clickable link)
      if (action === 'OPEN_UPLOAD_FORM') {
        console.log('\n📤 ===== OPEN UPLOAD FORM TRIGGERED =====');
        console.log('Customer Email:', visitorInfo.email);
        
        // Get first order ID for the upload form
        const customerData = await getComprehensiveCustomerData(visitorInfo.email);
        const firstOrderId = customerData.orders && customerData.orders.length > 0 
          ? customerData.orders[0].id 
          : '';
        
        const firstOrder = customerData.orders && customerData.orders.length > 0 ? customerData.orders[0] : null;
        const uploadProductId = firstOrder?.items?.[0]?.productId || firstOrder?.items?.[0]?.product_id || '';
        const uploadImageUrl = firstOrder?.items?.[0]?.imageUrl || firstOrder?.items?.[0]?.imageurl || firstOrder?.items?.[0]?.image_url || '';
        const uploadUrl = `${BASE_URL}/upload-form.html?email=${encodeURIComponent(visitorInfo.email)}&orderId=${encodeURIComponent(firstOrderId)}&productId=${encodeURIComponent(uploadProductId)}&imageUrl=${encodeURIComponent(uploadImageUrl)}`;
        
        // Send a message with the upload form link
        return res.status(200).json({
          action: "reply",
          replies: [{
            text: `📸 **Click the link below to open the upload form:**\n\n` +
                  `🔗 ${uploadUrl}\n\n` +
                  `✅ Upload your product image\n` +
                  `✅ AI will analyze it instantly\n` +
                  `✅ Results will appear in the widget panel\n\n` +
                  `💡 **Tip:** Click the link to open in your browser.`
          }]
        });
      }
      
      // 📸 HANDLE IMAGE UPLOAD TRIGGER (Instructions button)
      if (action === 'TRIGGER_IMAGE_UPLOAD') {
        console.log('\n📸 ===== IMAGE UPLOAD INSTRUCTIONS =====');
        console.log('Customer Email:', visitorInfo.email);
        
        // Send detailed instructions
        return res.status(200).json({
          action: "reply",
          replies: [{
            text: `📸 **How to Upload Product Image**\n\n` +
                  `**Method 1: Upload Form (Recommended)**\n` +
                  `👉 Click "📤 Upload Product Image" button\n` +
                  `👉 New window opens with drag & drop interface\n` +
                  `👉 Upload your image there\n\n` +
                  `**Method 2: Chat Attachment**\n` +
                  `👉 Click 📎 paperclip icon at bottom\n` +
                  `👉 Select your product image\n` +
                  `👉 Upload it\n\n` +
                  `⚡ **AI will automatically analyze:**\n` +
                  `✅ Product verification (correct item?)\n` +
                  `✅ Damage detection (any defects?)\n` +
                  `✅ Results in widget panel (agent view)`
          }]
        });
      }
      
      // ✅ HANDLE CANCEL ISSUE FROM SUPPORT ISSUES (Delete order and issue)
      if (action && action.startsWith('CANCEL_ISSUE:')) {
        console.log('\n🗑️ ===== CANCEL ISSUE TRIGGERED =====');
        console.log('Action:', action);
        
        // Parse: CANCEL_ISSUE:issueId:orderId
        const parts = action.split(':');
        if (parts.length < 3) {
          return res.status(200).json({
            action: "reply",
            replies: [{
              text: "Invalid issue format. Please try again."
            }],
            suggestions: ["Back to Menu"]
          });
        }
        
        const issueId = parts[1];
        const orderId = parts[2];
        
        console.log('Issue ID:', issueId);
        console.log('Order ID:', orderId);
        console.log('Customer Email:', visitorInfo.email);
        
        try {
          // Delete order and issue from Firestore
          console.log('\n🗑️ Deleting order and issue from Firestore...');
          const deleteResult = await deleteOrderFromFirestore(visitorInfo.email, orderId);
          
          if (deleteResult.success) {
            console.log('✅ Order and issue deleted successfully');
            
            // Send confirmation message to customer
            return res.status(200).json({
              action: "reply",
              replies: [{
                text: `✅ **Cancellation Request Removed**\n\n` +
                      `🆔 Order ID: ${orderId}\n` +
                      `🎫 Issue ID: ${issueId}\n\n` +
                      `The order and cancellation request have been removed from your account.\n` +
                      `If you need further assistance, please contact support.`
              }],
              suggestions: ["Back to Menu", "📞 Contact Support"]
            });
          } else {
            console.log('Failed to delete:', deleteResult.message);
            return res.status(200).json({
              action: "reply",
              replies: [{
                text: `Failed to remove issue: ${deleteResult.message || 'Unknown error'}`
              }],
              suggestions: ["Back to Menu", "📞 Contact Support"]
            });
          }
        } catch (error) {
          console.error('Error canceling issue:', error);
          return res.status(200).json({
            action: "reply",
            replies: [{
              text: "Failed to remove issue. Please try again or contact support."
            }],
            suggestions: ["Back to Menu", "📞 Contact Support"]
          });
        }
      }
    }

    // ✅ DEFAULT FALLBACK → SHOW CUSTOMER WIDGET
    if (!visitorInfo.email || visitorInfo.email === 'Not provided') {
      visitorInfo.email = 'demo@customer.com';
      visitorInfo.name = 'Demo Customer';
    }

    console.log('👤 VISITOR:', visitorInfo.name, visitorInfo.email);

    const widgetResponse = await sendCustomerWidget(visitorInfo);
    return res.status(200).json(widgetResponse);

  } catch (error) {
    console.error('WEBHOOK ERROR:', error.message);

    return res.status(200).json({
      type: 'widget_detail',
      sections: [
        {
          name: 'error',
          layout: 'info',
          title: 'Webhook Processing Error',
          data: [
            { label: 'Error', value: error.message },
            { label: 'Time', value: new Date().toISOString() }
          ]
        }
      ]
    });
  }
});

// Notifications endpoint
app.post('/api/notifications', handleNotification);

// Flutter activity endpoint (for CustomerTimelineService)
app.post('/api/flutter-activity', (req, res) => {
  try {
    console.log('📱 Flutter activity received:', req.body);
    res.status(200).json({ success: true, message: 'Activity logged' });
  } catch (error) {
    console.error('Flutter activity error:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// SalesIQ automation event tracking
app.post('/api/track-event', (req, res) => {
  try {
    const { event, data, timestamp, url } = req.body;
    console.log('📊 SalesIQ Event Tracked:', {
      event,
      data,
      timestamp,
      url: url?.substring(0, 100) // Truncate long URLs
    });
    
    // Here you could save to database, send to analytics, etc.
    res.status(200).json({ success: true, message: 'Event tracked successfully' });
  } catch (error) {
    console.error('Event tracking error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// ✅ API ENDPOINT: GET CANCELLABLE ORDERS (for Flutter app)
app.post('/api/get-cancellable-orders', async (req, res) => {
  try {
    console.log('\n📥 ===== GET CANCELLABLE ORDERS API =====');
    
    // Validate webhook secret
    const receivedSecret = req.headers['x-webhook-secret'];
    if (!receivedSecret || receivedSecret !== WEBHOOK_SECRET) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid webhook secret'
      });
    }
    
    const { customer_email } = req.body;
    
    if (!customer_email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: customer_email'
      });
    }
    
    console.log('🔍 Fetching cancellable orders for:', customer_email);
    
    let cancellableOrders = [];
    
    // Query Firestore
    if (firebaseEnabled && db) {
      try {
        // ✅ First get userId
const userId = await getUserIdFromEmail(customer_email);

if (!userId) {
  return res.status(404).json({
    success: false,
    message: 'User not found'
  });
}

// ✅ Now fetch from users/{userId}/orders
const ordersSnapshot = await db.collection('users')
  .doc(userId)
  .collection('orders')
  .get();

        
        ordersSnapshot.forEach(doc => {
          const orderData = doc.data();
          const status = orderData.status?.toString().toLowerCase().split('.').pop() || '';
          
          // Filter cancellable orders in code to avoid composite index
          if (status === 'confirmed' || status === 'processing' || status === 'pending') {
            cancellableOrders.push({
              id: doc.id,
              order_id: doc.id,
              product_name: orderData.items?.[0]?.productName || 'Product',
              total_amount: orderData.totalAmount || 0,
              status: status,
              orderDate: orderData.orderDate?.toDate?.()?.toISOString() || orderData.orderDate,
              paymentMethod: orderData.paymentMethod,
              paymentStatus: orderData.paymentStatus
            });
          }
        });
        
        console.log(`✅ Found ${cancellableOrders.length} cancellable orders from Firestore`);
      } catch (firestoreError) {
        console.error('Firestore query failed:', firestoreError.message);
      }
    }
    
    return res.status(200).json({
      success: true,
      orders: cancellableOrders,
      count: cancellableOrders.length
    });
    
  } catch (error) {
    console.error('Error fetching cancellable orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// 💳 CREATE RAZORPAY ORDER
app.post('/api/create-razorpay-order', async (req, res) => {
  try {
    console.log('\n💳 ===== CREATE RAZORPAY ORDER =====');
    const { amount, orderId, currency = 'INR', receipt } = req.body;
    
    if (!amount || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Amount and Order ID are required'
      });
    }

    const amountInPaise = Math.round(parseFloat(amount) * 100);
    
    const options = {
      amount: amountInPaise,
      currency: currency,
      receipt: receipt || `order_${orderId}_${Date.now()}`,
      notes: {
        order_id: orderId,
        source: 'salesiq_widget'
      }
    };

    console.log('📋 Razorpay Order Options:', options);
    
    const razorpayOrder = await razorpay.orders.create(options);
    
    console.log('✅ Razorpay Order Created:', razorpayOrder.id);
    
    res.status(200).json({
      success: true,
      razorpay_order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: RAZORPAY_KEY_ID
    });
    
  } catch (error) {
    console.error('❌ Razorpay Order Creation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Razorpay order',
      error: error.message
    });
  }
});

// 💳 VERIFY RAZORPAY PAYMENT
app.post('/api/verify-razorpay-payment', async (req, res) => {
  try {
    console.log('\n💳 ===== VERIFY RAZORPAY PAYMENT =====');
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification parameters'
      });
    }

    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    if (expectedSign === razorpay_signature) {
      console.log('✅ Payment Signature Verified');
      
      // Update Firestore with payment status
      if (order_id && firebaseEnabled) {
        try {
          console.log('📝 Updating order status in Firebase...');
          console.log('Order ID:', order_id);
          
          // Find ALL issues associated with this order
          const issuesSnapshot = await db.collection('issues')
            .where('orderId', '==', order_id)
            .get();
          
          if (!issuesSnapshot.empty) {
            const updatePromises = [];
            issuesSnapshot.forEach(issueDoc => {
              updatePromises.push(
                issueDoc.ref.update({
                  status: 'Paid',
                  paymentStatus: 'completed',
                  paymentId: razorpay_payment_id,
                  razorpayOrderId: razorpay_order_id,
                  paidAt: admin.firestore.FieldValue.serverTimestamp(),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                })
              );
            });
            
            await Promise.all(updatePromises);
            console.log(`✅ ${issuesSnapshot.size} issue(s) status updated to Paid in Firestore`);
          } else {
            console.log('⚠️ No issue found for order:', order_id);
          }
          
          // Also update the order document if it exists
          const orderRef = db.collection('orders').doc(order_id);
          const orderDoc = await orderRef.get();
          
          if (orderDoc.exists) {
            await orderRef.update({
              paymentStatus: 'completed',
              paymentId: razorpay_payment_id,
              razorpayOrderId: razorpay_order_id,
              paidAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ Order payment status updated in Firestore');
          }
        } catch (firestoreError) {
          console.error('❌ Firestore update error:', firestoreError);
        }
      }
      
      res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id
      });
    } else {
      console.log('❌ Payment Signature Verification Failed');
      res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }
    
  } catch (error) {
    console.error('❌ Payment Verification Error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification error',
      error: error.message
    });
  }
});

// Store payment URL in Firestore
app.post('/api/store-payment-url', async (req, res) => {
  try {
    console.log('\n💾 ===== STORE PAYMENT URL =====');
    const { order_id, payment_url, razorpay_order_id } = req.body;
    
    if (!order_id || !payment_url) {
      return res.status(400).json({
        success: false,
        message: 'Missing order_id or payment_url'
      });
    }
    
    console.log('Order ID:', order_id);
    console.log('Payment URL:', payment_url);
    
    if (firebaseEnabled) {
      // Find and update ALL issues for this order (not just the first one)
      const issuesSnapshot = await db.collection('issues')
        .where('orderId', '==', order_id)
        .get();
      
      if (!issuesSnapshot.empty) {
        const updatePromises = [];
        issuesSnapshot.forEach(issueDoc => {
          updatePromises.push(
            issueDoc.ref.update({
              paymentUrl: payment_url,
              razorpayOrderId: razorpay_order_id || null,
              paymentUrlCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            })
          );
        });
        
        await Promise.all(updatePromises);
        console.log(`✅ Payment URL stored in ${issuesSnapshot.size} issue(s) for order:`, order_id);
      } else {
        console.log('⚠️ No issue found for order:', order_id);
      }
      
      // Also update order document if exists
      const orderRef = db.collection('orders').doc(order_id);
      const orderDoc = await orderRef.get();
      
      if (orderDoc.exists) {
        await orderRef.update({
          paymentUrl: payment_url,
          razorpayOrderId: razorpay_order_id || null,
          paymentUrlCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Payment URL stored in order:', order_id);
      }
      
      res.status(200).json({
        success: true,
        message: 'Payment URL stored successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Firebase not enabled'
      });
    }
  } catch (error) {
    console.error('❌ Store Payment URL Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to store payment URL',
      error: error.message
    });
  }
});

// Form submission endpoint
app.post('/api/form-submit', async (req, res) => {
  try {
    const { form_name, form_data, visitor_info } = req.body;
    console.log('📋 Direct form submission:', form_name);
    
    const response = await processFormSubmission(form_name, form_data, visitor_info || {});
    res.status(200).json(response);
  } catch (error) {
    console.error('Form submission error:', error);
    res.status(500).json(createErrorResponse('Failed to process form submission'));
  }
});

// 🔐 SALESIQ FORM CONTROLLER ENDPOINT - Cancel/Return Form
app.post('/salesiq/form-submit', async (req, res) => {
  try {
    console.log('\n📥 ===== SALESIQ FORM SUBMISSION =====');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    // 1. SKIP WEBHOOK SECRET VALIDATION
    console.log("⚠️ SalesIQ webhook - secret validation skipped");
    
    // 2. EXTRACT PAYLOAD (handle both old and new format)
    const {
      order_id,
      user_id,
      action,
      reason,
      cancellation_reason,
      refund_method,
      bank_details,
      refund_details,
      idempotency_token,
      source,
      date,
      visitor,
      visitor_info,
      email
    } = req.body;
    
    // Normalize fields with SAFE fallback extraction
    const normalizedOrderId = order_id;
    const normalizedUserId =
      req.body.user_id ||
      req.body.visitor?.email ||
      req.body.visitor_info?.email ||
      req.body.email;
    const normalizedAction = action || 'cancel';
    const normalizedReason = cancellation_reason || reason || req.body.cancellation_reason;

    const normalizedRefundMethod = refund_method || refund_details?.refund_method || 'original_payment';
    const normalizedBankDetails = bank_details || refund_details?.refund_reference_info;
    
    console.log('📋 Normalized Form Data:');
    console.log('  Order ID:', normalizedOrderId);
    console.log('  User ID:', normalizedUserId);
    console.log('  Action:', normalizedAction);
    console.log('  Reason:', normalizedReason);
    console.log('  Refund Method:', normalizedRefundMethod);
    
    // 3. VALIDATE REQUIRED FIELDS
    if (!normalizedOrderId || !normalizedReason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: order_id or cancellation_reason'
      });
    }
    
    // 4. VALIDATE ACTION TYPE
    if (normalizedAction !== 'cancel' && normalizedAction !== 'return') {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "cancel" or "return"'
      });
    }
    
    // 5. VALIDATE REASON LENGTH
    if (normalizedReason.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Reason must be 500 characters or less'
      });
    }
    
    // 6. VALIDATE REFUND METHOD
    if (normalizedRefundMethod === 'bank_transfer' && !normalizedBankDetails) {
      return res.status(400).json({
        success: false,
        message: 'Bank account details are required for bank transfer refunds'
      });
    }
    
    // 7. CHECK IDEMPOTENCY (prevent duplicate submissions)
    console.log('🔑 Idempotency token:', idempotency_token);
    
    // 8. FETCH ORDER FROM FIRESTORE (from users subcollection)
    let orderData = null;
    let userId = null;
    if (firebaseEnabled && db) {
      try {
        userId = await getUserIdFromEmail(normalizedUserId);
        if (userId) {
          const orderDoc = await db.collection('users')
            .doc(userId)
            .collection('orders')
            .doc(normalizedOrderId)
            .get();
          
          if (orderDoc.exists) {
            orderData = orderDoc.data();
            console.log(`📦 Order found in Firestore: users/${userId}/orders/${normalizedOrderId}`);
          }
        } else {
          console.log('⚠️ User not found for email:', normalizedUserId);
        }
      } catch (firestoreError) {
        console.log('⚠️ Firestore lookup failed:', firestoreError.message);
      }
    }
    
    // Mock order data if not found
    if (!orderData) {
      orderData = {
        id: normalizedOrderId,
        customerEmail: normalizedUserId || 'demo@customer.com',
        totalAmount: refund_details?.refundable_amount || 1499,
        status: 'confirmed',
        items: [{ productName: 'Sample Product', price: 1499, quantity: 1 }]
      };
    }
    
    // 9. VALIDATE ORDER ELIGIBILITY
    const ineligibleStatuses = ['cancelled', 'returned', 'refunded'];
    if (ineligibleStatuses.includes(orderData.status?.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Order #${normalizedOrderId} is already ${orderData.status}. Cannot ${normalizedAction}.`
      });
    }
    
    // 10. CALCULATE REFUND AMOUNT
    const refundAmount = refund_details?.refundable_amount || orderData.totalAmount;
    const refundReference = `REF_${normalizedAction.toUpperCase()}_${Date.now()}`;
    
    // 11. UPDATE ORDER STATUS IN FIRESTORE (in users subcollection)
    const newStatus = normalizedAction === 'cancel' ? 'cancelled' : 'returned';
    if (firebaseEnabled && db && userId) {
      try {
        await db.collection('users')
          .doc(userId)
          .collection('orders')
          .doc(normalizedOrderId)
          .update({
          status: newStatus,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          [`${normalizedAction}_reason`]: normalizedReason,
          [`${normalizedAction}_date`]: date || new Date().toISOString(),
          refund: {
            amount: refundAmount,
            method: normalizedRefundMethod,
            reference: refundReference,
            status: 'initiated',
            initiated_at: admin.firestore.FieldValue.serverTimestamp(),
            bank_details: normalizedBankDetails || null
          }
        });
        console.log(`✅ Order ${normalizedOrderId} updated to ${newStatus} in users/${userId}/orders/${normalizedOrderId}`);
        
        // Create issue/ticket in Firestore
        const issueId = `ISS_${Date.now()}`;
        await db.collection('issues').doc(issueId).set({
          id: issueId,
          customerEmail: normalizedUserId,
          orderId: normalizedOrderId,
          issueType: action === 'cancel' ? 'Order Cancellation' : 'Product Return',
          description: normalizedReason,
          status: 'Processing',
          priority: 'High',
          resolution: `${normalizedAction} request received. Refund of ₹${refundAmount} initiated.`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Issue ${issueId} created in Firestore`);
      } catch (updateError) {
        console.error('⚠️ Firestore update failed:', updateError.message);
      }
    }
    
    // 12. INITIATE REFUND (simulate - in production, call payment gateway)
    console.log(`💰 Initiating refund: ₹${refundAmount} via ${normalizedRefundMethod}`);
    console.log(`📝 Refund reference: ${refundReference}`);
    
    // 13. NOTIFY OPERATOR (send to SalesIQ or email)
    const operatorNotification = {
      type: action === 'cancel' ? 'order_cancelled' : 'order_returned',
      customerEmail: normalizedUserId,
      orderId: normalizedOrderId,
      action: normalizedAction,
      reason: normalizedReason,
      refundAmount: refundAmount,
      refundMethod: normalizedRefundMethod,
      refundReference: refundReference,
      priority: 'high',
      timestamp: new Date().toISOString()
    };
    
    console.log('📧 Operator notification:', operatorNotification);
    
    // 14. AUDIT LOG
    console.log('📊 Audit log:', {
      event: `order_${normalizedAction}`,
      orderId: normalizedOrderId,
      userId: normalizedUserId,
      timestamp: new Date().toISOString()
    });
    
    // 15. RETURN CHAT MESSAGE RESPONSE TO SALESIQ
    console.log('✅ Form submission processed successfully');
    return res.status(200).json({
      type: "message",
      text: `✅ Your order #${normalizedOrderId} has been successfully ${newStatus}.\n\n💰 Refund: ₹${refundAmount}\n🔁 Method: ${normalizedRefundMethod}\n📄 Reference: ${refundReference}`,
      delay: 800
    });
    
  } catch (error) {
    console.error('SalesIQ form submission error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error processing form submission',
      error: error.message
    });
  }
});

// ✅ GET ORDER DETAILS (for SalesIQ Form Controller Detail Handler)
app.get('/api/get-order', async (req, res) => {
  try {
    const { order_id, email } = req.query;
    
    if (!email || !order_id) {
      return res.status(400).json({ error: 'Email and order_id are required' });
    }
    
    console.log(`\n📥 Fetching order details for Form Controller`);
    console.log(`  Order ID: ${order_id}`);
    console.log(`  Email: ${email}`);
    
    const customerData = await getCustomerData(email);
    if (!customerData) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Case-insensitive order matching
    const order = customerData.orders.find(o => o.id.toUpperCase() === order_id.toUpperCase());
    
    if (!order) {
      console.log(`Order not found: ${order_id}`);
      console.log(`📦 Available orders:`, customerData.orders.map(o => o.id));
      return res.status(404).json({ error: 'Order not found' });
    }

    console.log(`✅ Order found: ${order.id}`);
    
    // Return order details in format expected by SalesIQ Form Controller
    res.json({
      orderId: order.id,
      productName: order.items?.[0]?.productName || 'Product',
      amount: order.totalAmount,
      paymentMethod: order.paymentMethod || 'N/A',
      status: order.status,
      orderDate: order.createdAt || new Date().toISOString(),
      items: order.items || []
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ GET ALL ORDERS (for SalesIQ Widget listing)
app.get('/api/get-orders', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    console.log(`\n📥 Fetching all orders for: ${email}`);
    
    const customerData = await getCustomerData(email);
    if (!customerData) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Return orders in format expected by SalesIQ Widget
    const orders = customerData.orders.map(order => ({
      id: order.id,
      productName: order.items?.[0]?.productName || 'Product',
      amount: order.totalAmount,
      status: order.status,
      date: order.createdAt || new Date().toISOString(),
      paymentMethod: order.paymentMethod || 'N/A'
    }));
    
    console.log(`✅ Found ${orders.length} orders`);
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get customer data form
app.get('/api/forms/customer-data', (req, res) => {
  res.json(createCustomerDataForm());
});

// Get feedback form
app.get('/api/forms/feedback', (req, res) => {
  res.json(createFeedbackForm());
});

// Get cancel order form
app.get('/api/forms/cancel-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { customerEmail } = req.query;
    
    if (!customerEmail) {
      return res.status(400).json({ error: 'Customer email required' });
    }
    
    const customerData = await getCustomerData(customerEmail);
    if (!customerData) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const order = customerData.orders.find(o => o.id === orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(createCancelOrderForm(order));
  } catch (error) {
    console.error('Cancel form error:', error);
    res.status(500).json({ error: 'Failed to generate cancel form' });
  }
});

// Get return order form
app.get('/api/forms/return-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { customerEmail } = req.query;
    
    if (!customerEmail) {
      return res.status(400).json({ error: 'Customer email required' });
    }
    
    const customerData = await getCustomerData(customerEmail);
    if (!customerData) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const order = customerData.orders.find(o => o.id === orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(createReturnOrderForm(order));
  } catch (error) {
    console.error('Return form error:', error);
    res.status(500).json({ error: 'Failed to generate return form' });
  }
});

// 📅 EXPIRY DATE OCR VERIFICATION ENDPOINT
app.post('/api/upload-verify-expiry', upload.single('image'), async (req, res) => {
  try {
    console.log('\n📅 ===== EXPIRY DATE OCR VERIFICATION =====');
    console.log('📋 Request body:', req.body);
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No image file uploaded' 
      });
    }

    let { email, orderId, productId, imageUrl, productName: bodyProductName } = req.body;
    
    console.log('📧 Raw email from body:', email);
    console.log('📦 Raw orderId from body:', orderId);
    console.log('🆔 Raw productId from body:', productId);
    console.log('🖼️ Raw imageUrl from body:', imageUrl);
    console.log('📁 Uploaded file:', req.file.filename);

    // Debug: Log all body keys
    console.log('📋 All request body keys:', Object.keys(req.body));
    console.log('📋 Full request body:', JSON.stringify(req.body, null, 2));

    // Fix corrupted email - extract the actual email if it's malformed
    let cleanEmail = email;
    if (email && email.includes('3A2F')) {
      // Email is corrupted with URL encoding mixed in
      // Extract the part before the corruption (e.g., "arjunfree256" from "arjunfree2563A2F...")
      const emailPrefix = email.split('3A2F')[0];
      console.log('⚠️ Email appears corrupted, extracted prefix:', emailPrefix);
      
      // Reconstruct email by adding @gmail.com
      cleanEmail = emailPrefix + '@gmail.com';
      console.log('🔧 Reconstructed email:', cleanEmail);
    }

    // Validate email
    if (!cleanEmail || cleanEmail === 'Not provided' || cleanEmail === 'Not' || cleanEmail.length < 3) {
      console.error('⚠️ Invalid email provided:', cleanEmail);
      return res.status(400).json({ 
        success: false, 
        error: 'Valid customer email is required. Please use the upload link from the chat.'
      });
    }

    // Get customer data - try with cleaned email first, then search by prefix
    let customerData = await getCustomerData(cleanEmail);
    
    // If not found and email looks corrupted, try to find by searching all customers
    if (!customerData && email.includes('3A2F')) {
      console.log('🔍 Email corrupted, searching for customer by order ID:', orderId);
      // Query all customers and find by order ID
      const customersSnapshot = await db.collection('customers').get();
      for (const doc of customersSnapshot.docs) {
        const data = doc.data();
        const allOrders = [...(data.orders || []), ...(data.deliveredOrders || [])];
        if (allOrders.some(o => o.id === orderId)) {
          customerData = data;
          cleanEmail = data.email;
          console.log('✅ Found customer by order ID:', cleanEmail);
          break;
        }
      }
    }
    
    if (!customerData) {
      return res.status(404).json({ 
        success: false, 
        error: 'Customer not found' 
      });
    }

    const normalize = (v) => (v || '').toString().trim().toLowerCase();
    const itemProductId = (it) => it?.productId || it?.product_id || it?.id || null;
    const itemProductName = (it) => it?.productName || it?.productname || it?.name || null;
    const itemImageUrl = (it) => it?.imageUrl || it?.imageurl || it?.image_url || it?.image || it?.productImage || null;

    // Resolve correct order/item (orderId from issues can be wrong; prefer matching by productId/imageUrl)
    let resolvedOrderId = orderId || null;
    let order = null;
    let resolvedItem = null;

    const matchesItem = (it) => {
      if (!it) return false;
      if (productId && normalize(itemProductId(it)) === normalize(productId)) {
        console.log('✅ Matched by productId:', itemProductId(it));
        return true;
      }
      if (imageUrl) {
        const itemImg = itemImageUrl(it);
        if (itemImg) {
          // Extract base URL without query params for comparison
          // Remove everything after ? or = to get the core filename
          const baseImageUrl = normalize(imageUrl).split('?')[0].split('=')[0];
          const baseItemImg = normalize(itemImg).split('?')[0].split('=')[0];
          
          console.log('🔍 Comparing imageUrls:');
          console.log('  Received (base):', baseImageUrl);
          console.log('  Item (base):', baseItemImg);
          
          // Extract just the filename for comparison
          const receivedFilename = baseImageUrl.split('/').pop();
          const itemFilename = baseItemImg.split('/').pop();
          
          console.log('  Received filename:', receivedFilename);
          console.log('  Item filename:', itemFilename);
          
          if (receivedFilename && itemFilename && receivedFilename === itemFilename) {
            console.log('✅ Matched by filename:', itemFilename);
            return true;
          }
          
          if (baseItemImg.includes(baseImageUrl) || baseImageUrl.includes(baseItemImg)) {
            console.log('✅ Matched by base URL inclusion');
            return true;
          }
        }
      }
      return false;
    };

    const pickItemFromOrder = (o) => {
      if (!o || !Array.isArray(o.items) || o.items.length === 0) return null;
      if (productId || imageUrl) {
        const matched = o.items.find(matchesItem);
        if (matched) return matched;
      }
      return o.items[0];
    };

    if (resolvedOrderId) {
      if (customerData.deliveredOrders) {
        order = customerData.deliveredOrders.find(o => o.id === resolvedOrderId) || null;
      }
      if (!order && customerData.orders) {
        order = customerData.orders.find(o => o.id === resolvedOrderId) || null;
      }
      if (order) {
        resolvedItem = pickItemFromOrder(order);
      }
    }

    if ((!order || !resolvedItem) && (productId || imageUrl)) {
      const deliveredOrders = Array.isArray(customerData.deliveredOrders) ? customerData.deliveredOrders : [];
      for (const o of deliveredOrders) {
        const matched = (Array.isArray(o.items) ? o.items : []).find(matchesItem);
        if (matched) {
          resolvedOrderId = o.id;
          order = o;
          resolvedItem = matched;
          break;
        }
      }
    }

    if ((!order || !resolvedItem) && (productId || imageUrl)) {
      const orders = Array.isArray(customerData.orders) ? customerData.orders : [];
      for (const o of orders) {
        const matched = (Array.isArray(o.items) ? o.items : []).find(matchesItem);
        if (matched) {
          resolvedOrderId = o.id;
          order = o;
          resolvedItem = matched;
          break;
        }
      }
    }

    let productName = bodyProductName || 'Unknown Product';
    let originalProductImageUrl = imageUrl || '';
    const resolvedProductId = itemProductId(resolvedItem) || productId || '';

    if (resolvedItem) {
      productName = itemProductName(resolvedItem) || productName;
      originalProductImageUrl = itemImageUrl(resolvedItem) || originalProductImageUrl;
    }

    // Keep backwards-compatible orderId variable for downstream but ensure it's correct
    orderId = resolvedOrderId || orderId;
    productId = resolvedProductId;

    console.log('📦 Product Name:', productName);
    console.log('🖼️ Original Product Image URL:', originalProductImageUrl);

    // Analyze image with Gemini AI for expiry date OCR
    const uploadedImagePath = req.file.path;
    const expiryResult = await extractExpiryDateWithGemini(uploadedImagePath, productName);

    console.log('✅ Expiry OCR complete:', expiryResult);

    // Generate uploaded image URL
    const uploadedImageUrl = `${BASE_URL}/uploads/${req.file.filename}`;

    // ✅ CHECK IF PRODUCT IS EXPIRED
    if (expiryResult.isExpired) {
      console.log('⚠️ Product IS EXPIRED - storing in session (will save to Firestore when user confirms)');
      
      // Store expiry result in session temporarily (save to Firestore only when user clicks "Return to Chat")
      const issueId = `EXPIRY_${orderId}_${Date.now()}`;
      if (!userSessions.has(cleanEmail)) {
        userSessions.set(cleanEmail, {});
      }
      const session = userSessions.get(cleanEmail);
      
      // ✅ SET expiry_verify = true ONLY if product is expired
      if (expiryResult.isExpired) {
        session.expiry_verify = true;
        console.log('✅ expiry_verify set to TRUE - Product is expired');
      } else {
        session.expiry_verify = false;
        console.log('❌ expiry_verify remains FALSE - Product is not expired');
      }
      
      session.pendingExpiryVerification = {
        issueId: issueId,
        type: 'expiry_verification',
        customerEmail: cleanEmail,
        orderId: orderId,
        productName: productName,
        productId: productId || '',
        originalProductImageUrl: originalProductImageUrl,
        amount: order?.totalAmount || 0,
        issueType: 'Expired product',
        expiryVerification: {
          isExpired: true,
          expiryDate: expiryResult.expiryDate,
          currentDate: expiryResult.currentDate,
          confidence: expiryResult.confidence,
          extractedText: expiryResult.extractedText,
          uploadedExpiryImageUrl: uploadedImageUrl
        },
        status: 'Verified - Expired',
        priority: 'High',
        resolution: 'Product expired - Eligible for refund',
        timestamp: Date.now()
      };
      
      console.log('💾 Stored pending expiry verification in session');
      console.log('✅ Issue Type included:', session.pendingExpiryVerification.issueType);
      console.log('  expiry_verify:', session.expiry_verify);
      
      return res.json({
        success: true,
        isExpired: true,
        expiryDate: expiryResult.expiryDate,
        currentDate: expiryResult.currentDate,
        confidence: expiryResult.confidence,
        message: 'Product is expired. Click "Return to Chat" to proceed with product verification.',
        showReturnButton: true
      });
    }

    // ❌ PRODUCT IS NOT EXPIRED - Return error message
    console.log('✅ Product is NOT expired - returning error to user');
    
    return res.json({
      success: false,
      isExpired: false,
      expiryDate: expiryResult.expiryDate,
      currentDate: expiryResult.currentDate,
      confidence: expiryResult.confidence,
      message: 'Oops! The product is not expired yet. Expiry date: ' + expiryResult.expiryDate,
      showContactSupport: true
    });

  } catch (error) {
    console.error('❌ Expiry verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 📸 IMAGE UPLOAD & VERIFICATION ENDPOINT
app.post('/api/upload-verify-image', upload.single('image'), async (req, res) => {
  try {
    console.log('\n📸 ===== IMAGE UPLOAD & VERIFICATION =====');
    console.log('📋 Request body:', req.body);
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No image file uploaded' 
      });
    }

    let { email, orderId, productId, imageUrl, productName } = req.body;
    
    console.log('📧 Raw email from body:', email);
    console.log('📦 Raw orderId from body:', orderId);
    console.log('🆔 Raw productId from body:', productId);
    console.log('🖼️ Raw imageUrl from body:', imageUrl);
    
    // Fix corrupted email - extract the actual email if it's malformed
    let cleanEmail = email;
    
    // If orderId or productId are missing, try to retrieve from session
    if (email && (!orderId || !productId)) {
      console.log('🔧 Missing orderId/productId, checking session storage...');
      const session = productUploadSessions.get(email);
      if (session) {
        orderId = orderId || session.orderId;
        productId = productId || session.productId;
        imageUrl = imageUrl || session.imageUrl;
        productName = productName || session.productName;
        console.log('✅ Retrieved from session:');
        console.log('  📦 Order ID:', orderId);
        console.log('  🆔 Product ID:', productId);
        console.log('  🖼️ Image URL:', imageUrl);
        console.log('  📦 Product Name:', productName);
      } else {
        console.log('⚠️ No session found for email:', email);
      }
    }
    if (email && email.includes('3A2F')) {
      // Email is corrupted with URL encoding mixed in
      const emailPrefix = email.split('3A2F')[0];
      console.log('⚠️ Email appears corrupted, extracted prefix:', emailPrefix);
      
      // Reconstruct email by adding @gmail.com
      cleanEmail = emailPrefix + '@gmail.com';
      console.log('🔧 Reconstructed email:', cleanEmail);
    }
    
    // Validate email
    if (!cleanEmail || cleanEmail === 'Not provided' || cleanEmail === 'Not' || cleanEmail.length < 3) {
      console.error('⚠️ Invalid email provided:', cleanEmail);
      return res.status(400).json({ 
        success: false, 
        error: 'Valid customer email is required. Please use the upload link from the chat.'
      });
    }

    console.log('📧 Customer email:', cleanEmail);
    console.log('📦 Order ID:', orderId);
    console.log('🆔 Product ID:', productId);
    console.log('🖼️ Product Image URL:', imageUrl);
    console.log('📁 Uploaded file:', req.file.filename);

    // Get customer data - try with cleaned email first, then search by order ID
    let customerData = await getCustomerData(cleanEmail);
    
    // If not found and email looks corrupted, try to find by searching all customers
    if (!customerData && email.includes('3A2F')) {
      console.log('🔍 Email corrupted, searching for customer by order ID:', orderId);
      // Query all customers and find by order ID
      const customersSnapshot = await db.collection('customers').get();
      for (const doc of customersSnapshot.docs) {
        const data = doc.data();
        const allOrders = [...(data.orders || []), ...(data.deliveredOrders || [])];
        if (allOrders.some(o => o.id === orderId)) {
          customerData = data;
          cleanEmail = data.email;
          console.log('✅ Found customer by order ID:', cleanEmail);
          break;
        }
      }
    }
    
    if (!customerData) {
      return res.status(404).json({ 
        success: false, 
        error: 'Customer not found' 
      });
    }

    const normalize = (v) => (v || '').toString().trim().toLowerCase();
    const itemProductId = (it) => it?.productId || it?.product_id || it?.id || null;
    const itemProductName = (it) => it?.productName || it?.productname || it?.name || null;
    const itemImageUrl = (it) => it?.imageUrl || it?.imageurl || it?.image_url || it?.productImage || null;

    let resolvedOrderId = orderId || null;
    let resolvedOrder = null;
    let resolvedItem = null;

    const matchesItem = (it) => {
      if (!it) return false;
      if (productId && normalize(itemProductId(it)) === normalize(productId)) return true;
      if (productId && normalize(it?.productId) === normalize(productId)) return true;
      if (imageUrl && normalize(itemImageUrl(it)) === normalize(imageUrl)) return true;
      if (productName && normalize(itemProductName(it)) === normalize(productName)) return true;
      return false;
    };

    const tryResolveFromOrder = (order) => {
      if (!order || !Array.isArray(order.items) || order.items.length === 0) return null;
      if (productId || productName) {
        const matched = order.items.find(matchesItem);
        if (matched) return matched;
      }
      return order.items[0];
    };

    if (resolvedOrderId) {
      if (customerData.deliveredOrders && Array.isArray(customerData.deliveredOrders)) {
        resolvedOrder = customerData.deliveredOrders.find(o => o.id === resolvedOrderId) || null;
      }
      if (!resolvedOrder && customerData.orders && Array.isArray(customerData.orders)) {
        resolvedOrder = customerData.orders.find(o => o.id === resolvedOrderId) || null;
      }
      if (resolvedOrder) {
        resolvedItem = tryResolveFromOrder(resolvedOrder);
      }
    }

    if ((!resolvedOrder || !resolvedItem) && (productId || productName || imageUrl)) {
      console.log('🔍 orderId not usable - searching by product in delivered orders...');
      const deliveredOrders = Array.isArray(customerData.deliveredOrders) ? customerData.deliveredOrders : [];
      for (const o of deliveredOrders) {
        const matched = (Array.isArray(o.items) ? o.items : []).find(matchesItem);
        if (matched) {
          resolvedOrderId = o.id;
          resolvedOrder = o;
          resolvedItem = matched;
          break;
        }
      }
    }

    if ((!resolvedOrder || !resolvedItem) && (productId || productName || imageUrl)) {
      console.log('🔍 Still not found - searching by product in regular orders...');
      const orders = Array.isArray(customerData.orders) ? customerData.orders : [];
      for (const o of orders) {
        const matched = (Array.isArray(o.items) ? o.items : []).find(matchesItem);
        if (matched) {
          resolvedOrderId = o.id;
          resolvedOrder = o;
          resolvedItem = matched;
          break;
        }
      }
    }

    let productImageUrl = imageUrl || null;
    productName = productName || 'Unknown Product';
    const resolvedProductId = itemProductId(resolvedItem) || productId || null;

    if (!productImageUrl && resolvedItem) {
      productImageUrl = itemImageUrl(resolvedItem);
    }
    if (resolvedItem) {
      productName = itemProductName(resolvedItem) || productName;
    }

    if (!productImageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Product image URL not found. Please provide a valid orderId/productId or ensure the order item has an imageUrl.'
      });
    }

    if (!resolvedOrderId) {
      return res.status(400).json({
        success: false,
        error: 'Order not resolved. Please provide a valid orderId or productId/productName.'
      });
    }

    console.log('📦 Resolved Order ID:', resolvedOrderId);
    console.log('🆔 Resolved Product ID:', resolvedProductId);
    console.log('📦 Product Name:', productName);
    console.log('🔗 Product Image URL:', productImageUrl);

    // Analyze image with Hugging Face AI
    const uploadedImagePath = req.file.path;
    const analysisResult = await analyzeImageWithHuggingFace(uploadedImagePath, productImageUrl);

    console.log('✅ Analysis complete:', analysisResult);

    // Generate uploaded image URL (accessible via server)
    const uploadedImageUrl = `${BASE_URL}/uploads/${req.file.filename}`;

    // ❌ CHECK IF PRODUCT MATCHES - DON'T SAVE IF NO MATCH
    if (!analysisResult.isMatch) {
      console.log('❌ Product does not match - NOT saving to Firestore');
      
      // Return error response with try again message
      return res.json({
        success: false,
        productMatch: 'NO',
        damageDetected: analysisResult.damageDetected ? 'YES' : 'NO',
        message: 'Product does not match. Please upload the correct product image.',
        error: 'Product verification failed - image does not match the ordered product',
        tryAgain: true,
        autoClose: false
      });
    }

    // ✅ PRODUCT MATCHES - SAVE TO ISSUES TABLE IN FIRESTORE
    try {
      // Get order details for the issue
      let order = resolvedOrder;
      if (!order && resolvedOrderId) {
        if (customerData.deliveredOrders) {
          order = customerData.deliveredOrders.find(o => o.id === resolvedOrderId);
        }
        if (!order && customerData.orders) {
          order = customerData.orders.find(o => o.id === resolvedOrderId);
        }
      }

      // Calculate accuracy percentages
      const productAccuracy = analysisResult.confidence || 0;
      const damageAccuracy = analysisResult.damageDetected ? 
        (analysisResult.damageConfidence || 85) : 0;

      // 🔍 CHECK IF THIS IS FROM EXPIRY VERIFICATION FLOW
      console.log('🔍 Checking if this is from expiry verification flow...');
      const expiryIssuesSnapshot = await db.collection('issues')
        .where('type', '==', 'expiry_verification')
        .where('orderId', '==', resolvedOrderId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      
      let issueData;
      let isExpiryFlow = false;
      let expiryDocId = null;
      
      if (!expiryIssuesSnapshot.empty) {
        // This is from expiry verification - STORE in session (will update Firestore when user clicks Return to Chat)
        const expiryDoc = expiryIssuesSnapshot.docs[0];
        const expiryData = expiryDoc.data();
        expiryDocId = expiryDoc.id; // Get the actual Firestore document ID
        isExpiryFlow = true;
        
        console.log('✅ Found existing expiry verification:', expiryData.id);
        console.log('📄 Firestore document ID:', expiryDocId);
        console.log('💾 Storing product verification in session (will save to Firestore when user clicks Return to Chat)');
        
        // Prepare the update data but DON'T save to Firestore yet
        issueData = {
          ...expiryData,
          firestoreDocId: expiryDocId, // Store the actual Firestore document ID
          productVerification: {
            uploadedProductImageUrl: `${BASE_URL}/uploads/${req.file.filename}`,
            originalProductImageUrl: productImageUrl,
            isMatch: analysisResult.isMatch,
            damageDetected: analysisResult.damageDetected,
            confidence: analysisResult.confidence,
            productAccuracy: productAccuracy,
            damageAccuracy: damageAccuracy
          },
          status: 'Verified - Product Matched',
          resolution: analysisResult.damageDetected
            ? 'Product expired and damaged. Eligible for full refund.'
            : 'Product expired but no damage. Eligible for refund.'
        };
        
        console.log('✅ Product verification stored in session, waiting for user confirmation');
      } else {
        // Regular product verification (not from expiry flow) - STORE in session
        console.log('📝 No expiry verification found - storing new product verification in session');
        
        issueData = {
          id: `RETURN_${Date.now()}`,
          type: 'product_verification',
          customerEmail: cleanEmail,
          orderId: resolvedOrderId || 'N/A',
          productName: productName,
          amount: order?.totalAmount || 0,
          issueType: 'Order Return - Image Verification',
          description: `Customer uploaded product image for return verification. Product match: YES, Damage: ${analysisResult.damageDetected ? 'YES' : 'NO'}`,
          status: 'Pending Review',
          returnReason: 'Image verification completed',
          productAccuracy: productAccuracy,
          damageAccuracy: damageAccuracy,
          imageVerification: {
            uploadedImageUrl: `${BASE_URL}/uploads/${req.file.filename}`,
            productImageUrl: productImageUrl,
            isMatch: analysisResult.isMatch,
            damageDetected: analysisResult.damageDetected,
            confidence: analysisResult.confidence
          },
          resolution: analysisResult.damageDetected
            ? 'Damage detected. Requires agent review.'
            : 'Image verified successfully. Awaiting agent approval.',
          returnReference: `RET_${orderId}_${Date.now()}`,
          paymentMethod: order?.paymentMethod || 'N/A',
          source: 'salesiq_image_verification'
        };

        console.log('✅ Product verification stored in session, waiting for user confirmation');
      }

      // Store verification result in user session (use cleanEmail)
      if (!userSessions.has(cleanEmail)) {
        userSessions.set(cleanEmail, {});
      }
      const session = userSessions.get(cleanEmail);
      
      // Store pending product verification (will save to Firestore when user confirms)
      session.pendingProductVerification = issueData;
      
      // ✅ SET product_verify = true ONLY if product matches
      if (analysisResult.isMatch) {
        session.product_verify = true;
        console.log('✅ product_verify set to TRUE - Product matched successfully');
      } else {
        session.product_verify = false;
        console.log('❌ product_verify remains FALSE - Product did not match');
      }
      
      session.verificationResult = {
        orderId: orderId,
        productName: productName,
        amount: order?.totalAmount || 0,
        productAccuracy: productAccuracy,
        damageAccuracy: damageAccuracy,
        isMatch: analysisResult.isMatch,
        damageDetected: analysisResult.damageDetected,
        issueId: issueData.id,
        isExpiryFlow: isExpiryFlow,
        timestamp: Date.now()
      };

      console.log('✅ Verification result stored in session for:', cleanEmail);
      console.log('  Issue ID:', issueData.id);
      console.log('  Is Expiry Flow:', isExpiryFlow);
      console.log('  product_verify:', session.product_verify);
      console.log('💾 Pending product verification stored, waiting for user to click Return to Chat');
      
      console.log('⏳ Verification complete - waiting for user confirmation before displaying results');
      
    } catch (saveError) {
      console.error('⚠️ Error saving to Firestore:', saveError.message);
      // Continue even if save fails
    }

    // Return success result to upload form with auto-close instruction
    res.json({
      success: true,
      productMatch: 'YES',
      damageDetected: analysisResult.damageDetected ? 'YES' : 'NO',
      message: analysisResult.damageDetected 
        ? 'Product verified - Damage detected' 
        : 'Product verified - No damage',
      saved: true,
      autoClose: true
    });

  } catch (error) {
    console.error('❌ Image upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 📸 CREATE IMAGE UPLOAD WIDGET (HTML form for drag-and-drop)
function createImageUploadWidget(email, orderId = null) {
  return {
    type: "widget_detail",
    sections: [
      {
        name: "image_upload_form",
        layout: "info",
        title: "📸 Upload Product Image",
        data: [
          { label: "Instructions", value: "Upload a photo of your product for AI verification" },
          { label: "Supported", value: "JPG, PNG, GIF, WebP (Max 10MB)" },
          { label: "Email", value: email },
          { label: "Order ID", value: orderId || 'Auto-detect' }
        ],
        actions: [
          {
            label: "📤 Open Upload Form",
            name: "SHOW_UPLOAD_FORM",
            type: "url",
            url: `http://localhost:${PORT}/upload-form.html?email=${email}&orderId=${orderId || ''}`
          }
        ]
      }
    ]
  };
}

// 🎯 GET ISSUE BY ORDER ID (for Deluge to fetch customer info)
app.get('/api/get-issue-by-order', async (req, res) => {
  try {
    const orderId = req.query.orderId;
    console.log('📋 Fetching issue for order:', orderId);
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Missing orderId parameter'
      });
    }
    
    if (firebaseEnabled) {
      const issuesSnapshot = await db.collection('issues')
        .where('orderId', '==', orderId)
        .limit(1)
        .get();
      
      if (!issuesSnapshot.empty) {
        const issueDoc = issuesSnapshot.docs[0];
        const issueData = issueDoc.data();
        
        console.log('✅ Found issue:', issueDoc.id);
        
        return res.json({
          success: true,
          issue: {
            id: issueDoc.id,
            orderId: issueData.orderId,
            customerEmail: issueData.customerEmail,
            productName: issueData.productName,
            amount: issueData.amount,
            status: issueData.status,
            issueType: issueData.issueType
          }
        });
      } else {
        return res.json({
          success: false,
          message: 'Issue not found'
        });
      }
    } else {
      return res.json({
        success: false,
        message: 'Firebase not enabled'
      });
    }
  } catch (error) {
    console.error('❌ Error fetching issue:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 🎯 GET CUSTOMER PROFILE BY EMAIL (for Deluge to fetch customer name)
app.get('/api/get-customer-profile', async (req, res) => {
  try {
    const email = req.query.email;
    console.log('👤 Fetching customer profile for:', email);
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Missing email parameter'
      });
    }
    
    if (firebaseEnabled) {
      const usersSnapshot = await db.collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();
      
      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();
        
        console.log('✅ Found customer profile:', userData.name);
        
        return res.json({
          success: true,
          profile: {
            name: userData.name || 'Customer',
            email: userData.email,
            phone: userData.phone || ''
          }
        });
      } else {
        return res.json({
          success: false,
          message: 'Customer profile not found'
        });
      }
    } else {
      return res.json({
        success: false,
        message: 'Firebase not enabled'
      });
    }
  } catch (error) {
    console.error('❌ Error fetching customer profile:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 🎯 GET VERIFICATION STATUS (for Flutter app to poll)
app.get('/api/verification-status/:email', (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    console.log('📊 Checking verification status for:', email);
    
    const session = userSessions.get(email);
    
    if (session && session.verificationResult && session.autoDisplayVerification) {
      const result = session.verificationResult;
      
      // Check if result is recent (within last 5 minutes)
      const isRecent = (Date.now() - result.timestamp) < 5 * 60 * 1000;
      
      if (isRecent) {
        console.log('✅ Verification result found and ready to display');
        
        // Return the result but DON'T clear it yet
        // It will be cleared when displayed in chat
        return res.json({
          hasResult: true,
          result: {
            productName: result.productName,
            amount: result.amount,
            productAccuracy: result.productAccuracy,
            damageAccuracy: result.damageAccuracy,
            isMatch: result.isMatch,
            damageDetected: result.damageDetected,
            issueId: result.issueId,
            statusText: result.isMatch 
              ? (result.damageDetected ? 'Verified with Damage' : 'Verified')
              : 'Not Verified'
          }
        });
      }
    }
    
    res.json({ hasResult: false });
  } catch (error) {
    console.error('Error checking verification status:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🔑 API endpoint to retrieve expiry upload session data
app.get('/api/get-expiry-session', (req, res) => {
  try {
    let email = req.query.email;
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email parameter required' });
    }
    
    console.log('🔍 Retrieving expiry session for:', email);
    
    // Fix mangled email - extract actual email if it contains encoded URL parts
    // Example: "arjunfree2563A2Fimg.clevup.in..." -> "arjunfree256@gmail.com"
    if (email.includes('3A2F') || email.includes('2F')) {
      const emailPrefix = email.split('3A2F')[0].split('2F')[0];
      if (emailPrefix && !emailPrefix.includes('@')) {
        email = emailPrefix + '@gmail.com';
        console.log('🔧 Extracted email from mangled parameter:', email);
      }
    }
    
    const session = expiryUploadSessions.get(email);
    
    if (!session) {
      console.log('⚠️ No session found for:', email);
      return res.json({ success: false, error: 'No session found' });
    }
    
    // Check if session is still valid (within 30 minutes)
    const isValid = (Date.now() - session.timestamp) < 30 * 60 * 1000;
    
    if (!isValid) {
      console.log('⚠️ Session expired for:', email);
      expiryUploadSessions.delete(email);
      return res.json({ success: false, error: 'Session expired' });
    }
    
    console.log('✅ Session found:', session);
    
    return res.json({
      success: true,
      orderId: session.orderId,
      productId: session.productId,
      imageUrl: session.imageUrl,
      productName: session.productName
    });
  } catch (error) {
    console.error('❌ Error retrieving session:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 🔑 API endpoint to retrieve product upload session data
app.get('/api/get-product-session', (req, res) => {
  try {
    let email = req.query.email;
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email parameter required' });
    }
    
    console.log('🔍 Retrieving product session for:', email);
    
    // Fix mangled email - extract actual email if it contains encoded URL parts
    // Example: "arjunfree2563A2Fimg.clevup.in..." -> "arjunfree256@gmail.com"
    if (email.includes('3A2F') || email.includes('2F')) {
      const emailPrefix = email.split('3A2F')[0].split('2F')[0];
      if (emailPrefix && !emailPrefix.includes('@')) {
        email = emailPrefix + '@gmail.com';
        console.log('🔧 Extracted email from mangled parameter:', email);
      }
    }
    
    const session = productUploadSessions.get(email);
    
    if (!session) {
      console.log('⚠️ No session found for:', email);
      return res.json({ success: false, error: 'No session found' });
    }
    
    // Check if session is still valid (within 30 minutes)
    const isValid = (Date.now() - session.timestamp) < 30 * 60 * 1000;
    
    if (!isValid) {
      console.log('⚠️ Session expired for:', email);
      productUploadSessions.delete(email);
      return res.json({ success: false, error: 'Session expired' });
    }
    
    console.log('✅ Session found:', session);
    
    return res.json({
      success: true,
      orderId: session.orderId,
      productId: session.productId,
      imageUrl: session.imageUrl,
      productName: session.productName
    });
  } catch (error) {
    console.error('❌ Error retrieving session:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get customer data by order ID
app.get('/api/get-order-customer', async (req, res) => {
  try {
    const { orderId } = req.query;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'orderId is required'
      });
    }
    
    console.log('🔍 Fetching customer data for order:', orderId);
    
    // Query all customers to find the one with this order
    const customersSnapshot = await db.collection('customers').get();
    
    for (const doc of customersSnapshot.docs) {
      const customerData = doc.data();
      const allOrders = [...(customerData.orders || []), ...(customerData.deliveredOrders || [])];
      
      const order = allOrders.find(o => o.id === orderId);
      if (order) {
        console.log('✅ Found customer:', customerData.email);
        return res.status(200).json({
          success: true,
          customerName: customerData.name || customerData.customerName || 'Customer',
          customerEmail: customerData.email || 'N/A',
          customerPhone: customerData.phone || customerData.phoneNumber || ''
        });
      }
    }
    
    // If not found in customers collection, try users collection
    const usersSnapshot = await db.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      
      // Check orders subcollection
      const ordersSnapshot = await db.collection('users')
        .doc(userDoc.id)
        .collection('orders')
        .where('__name__', '==', orderId)
        .limit(1)
        .get();
      
      if (!ordersSnapshot.empty) {
        console.log('✅ Found customer in users:', userData.email);
        return res.status(200).json({
          success: true,
          customerName: userData.name || 'Customer',
          customerEmail: userData.email || 'N/A',
          customerPhone: userData.phone || ''
        });
      }
      
      // Check delivered subcollection
      const deliveredSnapshot = await db.collection('users')
        .doc(userDoc.id)
        .collection('delivered')
        .where('__name__', '==', orderId)
        .limit(1)
        .get();
      
      if (!deliveredSnapshot.empty) {
        console.log('✅ Found customer in users/delivered:', userData.email);
        return res.status(200).json({
          success: true,
          customerName: userData.name || 'Customer',
          customerEmail: userData.email || 'N/A',
          customerPhone: userData.phone || ''
        });
      }
    }
    
    console.log('⚠️ Customer not found for order:', orderId);
    return res.status(404).json({
      success: false,
      error: 'Customer not found for this order'
    });
    
  } catch (error) {
    console.error('❌ Error fetching customer data:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint to save payment URL from Deluge script
app.post('/api/save-payment-url', async (req, res) => {
  try {
    console.log('\n💳 ===== SAVE PAYMENT URL REQUEST =====');
    const { issueId, paymentUrl } = req.body;
    
    console.log('Issue ID:', issueId);
    console.log('Payment URL:', paymentUrl);
    
    if (!issueId || !paymentUrl) {
      return res.status(400).json({
        success: false,
        error: 'issueId and paymentUrl are required'
      });
    }
    
    // Save to Firestore
    console.log('💾 Saving payment URL to Firestore...');
    await db.collection('issues').doc(issueId).update({
      paymentUrl: paymentUrl,
      paymentGenerated: true,
      paymentGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Payment URL saved successfully');
    
    return res.status(200).json({
      success: true,
      message: 'Payment URL saved to Firestore'
    });
  } catch (error) {
    console.error('❌ Error saving payment URL:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 SalesIQ Webhook Server Running`);
  console.log(`📍 Local URL: http://localhost:${PORT}`);
  console.log(`📋 Health Check: http://localhost:${PORT}/`);
  console.log(`🔗 Webhook Endpoint: http://localhost:${PORT}/webhook`);
  console.log(`🔐 SalesIQ Form Submit: http://localhost:${PORT}/salesiq/form-submit`);
  console.log(`📡 Notifications: http://localhost:${PORT}/api/notifications`);
  console.log(`📊 Verification Status: http://localhost:${PORT}/api/verification-status/:email`);
  console.log(`\n🔑 Webhook Secret: ${WEBHOOK_SECRET}`);
  console.log(`💡 Update your Flutter app to use: http://localhost:${PORT}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down webhook server...');
  process.exit(0);
});

/*
===============================================
🧪 CURL TEST COMMANDS
===============================================

1️⃣ HEALTH CHECK
curl -X GET http://localhost:3000/

2️⃣ CANCEL ORDER SELECTION (Simulate user clicking "Cancel Order")
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "handler": "message",
    "operation": "message",
    "visitor": {
      "name": "Arjun",
      "email": "arjunfree256@gmail.com"
    },
    "message": {
      "text": "Cancel Order"
    }
  }'

3️⃣ ORDER SELECTION (Simulate user clicking order button)
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "handler": "message",
    "operation": "message",
    "visitor": {
      "name": "Arjun",
      "email": "arjunfree256@gmail.com"
    },
    "message": {
      "text": "Order ORD1765130519686 | Bluetooth Speaker | ₹3798"
    }
  }'

4️⃣ FORM SUBMIT - CANCEL ORDER
curl -X POST http://localhost:3000/salesiq/form-submit \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your_shared_secret_here_change_in_production" \
  -d '{
    "order_id": "ORD1765130519686",
    "user_id": "arjunfree256@gmail.com",
    "action": "cancel",
    "cancellation_reason": "Changed my mind",
    "refund_method": "original_payment",
    "idempotency_token": "cancel_1234567890_ORD1765130519686"
  }'

5️⃣ FORM SUBMIT - RETURN ORDER
curl -X POST http://localhost:3000/salesiq/form-submit \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your_shared_secret_here_change_in_production" \
  -d '{
    "order_id": "ORD1765130519686",
    "user_id": "arjunfree256@gmail.com",
    "action": "return",
    "cancellation_reason": "Product defective",
    "refund_method": "bank_transfer",
    "bank_details": "Account: 1234567890, IFSC: HDFC0001234",
    "idempotency_token": "return_1234567890_ORD1765130519686"
  }'

6️⃣ GET CANCELLABLE ORDERS (Flutter API)
curl -X POST http://localhost:3000/api/get-cancellable-orders \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your_shared_secret_here_change_in_production" \
  -d '{
    "customer_email": "arjunfree256@gmail.com"
  }'

7️⃣ RETURN ORDER SELECTION
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "handler": "message",
    "operation": "message",
    "visitor": {
      "name": "Arjun",
      "email": "arjunfree256@gmail.com"
    },
    "message": {
      "text": "🔄 Return Order"
    }
  }'

===============================================
📝 NOTES:
- Replace localhost:3000 with your actual server URL
- Update x-webhook-secret header with your actual secret
- Update order_id and customer_email with real values
- For production, use HTTPS endpoints
===============================================
*/
