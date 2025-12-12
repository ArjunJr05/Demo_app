# 📸 Image Upload & Verification Setup Guide

## Overview
This feature allows customers to upload product images through SalesIQ chat, which are then analyzed using Google's Gemini AI to verify if the uploaded image matches the product and detect any damage.

## Features
- ✅ Drag-and-drop image upload
- ✅ AI-powered image comparison
- ✅ Damage detection
- ✅ Real-time verification results
- ✅ Beautiful UI with image comparison view

## Prerequisites
1. Node.js (v14 or higher)
2. Google Gemini API Key
3. Firebase Admin SDK (already configured)

## Installation Steps

### 1. Install Dependencies
```bash
cd c:\Users\arjun\salesiq\webhook\api
npm install
```

This will install:
- `@google/generative-ai` - Google Gemini AI SDK
- `multer` - File upload middleware
- `axios` - HTTP client for downloading images

### 2. Get Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 3. Configure Environment Variables
Create a `.env` file in `c:\Users\arjun\salesiq\webhook\api\`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
WEBHOOK_SECRET=your_webhook_secret_here
```

Or set the environment variable directly in your system:
```bash
# Windows PowerShell
$env:GEMINI_API_KEY="your_gemini_api_key_here"

# Windows CMD
set GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Update webhook_local.js (Already Done)
The following has been added to your code:
- Multer configuration for file uploads
- Gemini AI integration
- Image analysis function
- Upload endpoint `/api/upload-verify-image`
- Image upload widget in customer widget
- Upload form HTML page

### 5. Start the Server
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## How It Works

### 1. Customer Flow
1. Customer opens SalesIQ chat
2. Widget displays "📸 Product Verification" section
3. Customer clicks "📤 Upload & Verify Product"
4. Opens upload form with drag-and-drop interface
5. Customer uploads product image
6. AI analyzes and compares with product database
7. Results displayed instantly

### 2. Technical Flow
```
Customer Upload → Multer (File Storage) → Gemini AI Analysis → Result Display
                                              ↓
                                    Compare with Product URL
                                              ↓
                                    Detect Damage/Issues
```

### 3. API Endpoints

#### Upload & Verify Image
```bash
POST /api/upload-verify-image
Content-Type: multipart/form-data

Body:
- image: File (required)
- email: String (required)
- orderId: String (optional)
- productId: String (optional)

Response:
{
  "success": true,
  "uploadedImageUrl": "http://localhost:3000/uploads/...",
  "productImageUrl": "https://...",
  "productName": "Wireless Earbuds Pro",
  "analysis": {
    "isMatch": true,
    "confidence": 95,
    "productName": "Wireless Earbuds",
    "damageDetected": false,
    "damageDetails": "No damage detected",
    "recommendation": "Product is in good condition",
    "analysis": "Detailed AI analysis..."
  },
  "message": "✅ Image is correct, No damage detected"
}
```

#### Access Upload Form
```
GET /upload-form.html?email=customer@example.com&orderId=ORD123
```

## Testing

### 1. Test Upload Form Directly
Open in browser:
```
http://localhost:3000/upload-form.html?email=test@example.com&orderId=ORD1701234567891
```

### 2. Test via SalesIQ Widget
1. Open SalesIQ chat
2. Look for "📸 Product Verification" section
3. Click "📤 Upload & Verify Product"
4. Upload an image

### 3. Test API with cURL
```bash
curl -X POST http://localhost:3000/api/upload-verify-image \
  -F "image=@/path/to/image.jpg" \
  -F "email=test@example.com" \
  -F "orderId=ORD1701234567891"
```

## File Structure
```
webhook/api/
├── webhook_local.js          # Main server file (updated)
├── upload-form.html          # Upload form UI (new)
├── package.json              # Dependencies (updated)
├── uploads/                  # Uploaded images directory (auto-created)
└── SETUP_IMAGE_UPLOAD.md    # This file
```

## Gemini AI Prompt
The AI analyzes images using this prompt:
- Compares uploaded image with product database image
- Verifies if they show the same product
- Detects visible damage or defects
- Provides confidence score (0-100)
- Returns structured JSON response

## Response Types

### ✅ Success - No Damage
```json
{
  "isMatch": true,
  "confidence": 95,
  "damageDetected": false,
  "damageDetails": "No damage detected",
  "message": "✅ Image is correct, No damage detected"
}
```

### ⚠️ Success - Damage Detected
```json
{
  "isMatch": true,
  "confidence": 90,
  "damageDetected": true,
  "damageDetails": "Scratches visible on the surface",
  "message": "✅ Image is correct, ⚠️ Damage detected"
}
```

### ❌ Mismatch
```json
{
  "isMatch": false,
  "confidence": 30,
  "message": "❌ Image does not match the product"
}
```

## Troubleshooting

### Error: "GEMINI_API_KEY not set"
- Make sure you've set the environment variable
- Check `.env` file or system environment variables

### Error: "Product image URL not found"
- Ensure the customer has orders with product images
- Or provide `orderId` or `productId` in the request

### Error: "File too large"
- Maximum file size is 10MB
- Compress the image before uploading

### Error: "Invalid file type"
- Only JPG, PNG, GIF, WebP are supported
- Check file extension and MIME type

## Security Considerations
1. **File Size Limit**: 10MB maximum
2. **File Type Validation**: Only images allowed
3. **Unique Filenames**: Prevents overwriting
4. **CORS**: Configured for security
5. **API Key**: Keep GEMINI_API_KEY secret

## Production Deployment
1. Use environment variables for API keys
2. Set up HTTPS
3. Configure proper CORS origins
4. Add rate limiting
5. Set up file cleanup cron job
6. Use cloud storage (S3, GCS) instead of local storage

## Cost Considerations
- Gemini API: Free tier available (60 requests/minute)
- Check [Google AI Pricing](https://ai.google.dev/pricing)
- Monitor usage in Google Cloud Console

## Support
For issues or questions:
1. Check server logs: `npm start`
2. Test API endpoints with cURL
3. Verify Gemini API key is valid
4. Check Firebase configuration

## Next Steps
1. ✅ Install dependencies: `npm install`
2. ✅ Get Gemini API key
3. ✅ Set environment variable
4. ✅ Start server: `npm start`
5. ✅ Test upload form
6. ✅ Integrate with SalesIQ

---
**Last Updated**: December 2024
**Author**: ArjunJr05
