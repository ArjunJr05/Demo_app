# 🚀 Quick Test Guide - Image Upload in SalesIQ

## ✅ Server is Running!

Your webhook server is already running on **http://localhost:3000**

---

## 🎯 Test in 3 Simple Steps

### Step 1: Open SalesIQ Chat
Open your Flutter app and start a SalesIQ chat session.

You'll see this widget section:

```
┌─────────────────────────────────────┐
│ 📸 Product Verification with AI     │
├─────────────────────────────────────┤
│ How to Upload:                      │
│ Click the 📎 paperclip icon below   │
│ and select an image                 │
└─────────────────────────────────────┘
```

### Step 2: Upload Image via Paperclip 📎
1. Look at the **bottom** of the SalesIQ chat
2. Find the **📎 paperclip icon** (next to text input)
3. Click it
4. Select any product image from your device
5. Upload

### Step 3: See AI Results
Wait 3-5 seconds and you'll see:

```
📸 Image Verification Results

🆔 Order: ORD1765202457052
📦 Product: Wireless Earbuds Pro

✅ Image Verified: Correct product
🎯 Confidence: 95%

⚠️ Damage Detected (or ✅ No Damage)
📋 Details: [AI analysis here]
💡 Recommendation: [Action needed]
```

---

## 📺 What You'll See in Terminal

When customer uploads image, your terminal will show:

```
📸 ===== FILE ATTACHMENT DETECTED =====
File URL: https://salesiq-cdn.zoho.com/...
File Name: product.jpg
File Type: image/jpeg
File Size: 245678

📥 Downloading image from SalesIQ...
✅ Image saved: salesiq-1734778234567-product.jpg

🤖 Starting AI analysis...
Product: Wireless Earbuds Pro
Order ID: ORD1765202457052

✅ AI Analysis complete: {
  isMatch: true,
  confidence: 95,
  damageDetected: true,
  damageDetails: "Visible scratches on surface"
}
```

---

## 🎬 Visual Flow

```
┌──────────────────────────────────────────┐
│  Customer in SalesIQ Chat                │
│  ┌────────────────────────────────────┐  │
│  │ 📸 Product Verification with AI    │  │
│  │ Click 📎 paperclip to upload       │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [Type message here...]  📎 📷 🎤       │
│                           ↑              │
│                    CLICK THIS!           │
└──────────────────────────────────────────┘
                    ↓
         Customer selects image
                    ↓
         Image uploads to SalesIQ
                    ↓
┌──────────────────────────────────────────┐
│  Your Webhook Server                     │
│  📥 Receives file attachment event       │
│  📥 Downloads image from SalesIQ         │
│  💾 Saves to uploads/ folder             │
│  🔍 Finds product from customer order    │
│  🤖 Calls Gemini AI                      │
│  ✅ Gets analysis results                │
│  📤 Sends response to SalesIQ            │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│  Customer sees results in chat           │
│  ┌────────────────────────────────────┐  │
│  │ 📸 Image Verification Results      │  │
│  │ ✅ Correct product                 │  │
│  │ ⚠️ Damage detected                 │  │
│  │ 💡 Contact support for help        │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

---

## ✅ Checklist Before Testing

- [x] Server running (`node webhook_local.js`)
- [x] Gemini API key set (`GEMINI_API_KEY` environment variable)
- [x] Widget code updated with image upload section
- [x] File attachment handler added to webhook
- [x] AI analysis function working
- [ ] **YOUR TURN**: Open app and test!

---

## 🎯 Expected Behavior

### When Customer Uploads Image:

1. **Image appears in chat** (SalesIQ shows it)
2. **3-5 second wait** (AI analyzing)
3. **Results message appears** with:
   - Order ID
   - Product name
   - Verification status (✅ or ❌)
   - Confidence score
   - Damage detection (⚠️ or ✅)
   - Recommendations

### If Something Goes Wrong:

**Error: "No product found in orders"**
- Customer needs to have at least one order
- Check Firebase has order data for this customer

**Error: "Failed to analyze image"**
- Check Gemini API key is set
- Check internet connection
- Check image is valid format

**No response at all**
- Check webhook is running
- Check SalesIQ webhook URL is configured
- Check terminal for error messages

---

## 🔍 Where to Look

### In SalesIQ Chat:
- Widget shows "📸 Product Verification with AI"
- Paperclip icon at bottom of chat
- Results appear as chat messages

### In Terminal:
- File attachment detection logs
- AI analysis progress
- Success/error messages

### In File System:
- `webhook/api/uploads/` folder
- Images saved as `salesiq-{timestamp}-{filename}`

---

## 💡 Pro Tips

1. **Test with real product image**: Use an image that matches a product in your Firebase orders
2. **Check customer has orders**: Make sure test customer has order data
3. **Watch terminal logs**: They show exactly what's happening
4. **Try different images**: Test with damaged vs undamaged products
5. **Test error cases**: Upload non-image files, upload without orders, etc.

---

## 🎉 Success Criteria

You'll know it's working when:
- ✅ Widget shows image upload instructions
- ✅ Paperclip icon is visible in chat
- ✅ Image uploads successfully
- ✅ AI analysis completes
- ✅ Results appear in chat within 5 seconds
- ✅ Terminal shows all processing steps

---

## 🚀 Ready to Test!

**Everything is configured and running.**

Just open your app, go to SalesIQ chat, and click the 📎 paperclip icon!

---

**Server Status**: ✅ RUNNING on http://localhost:3000
**Feature Status**: ✅ READY TO TEST
**Next Step**: Open app → SalesIQ chat → Click 📎 → Upload image!
