# 🤖 SalesIQ Bot Setup - Step by Step Guide

## Complete walkthrough with exact clicks and settings

---

## Part 1: Create the Form (5 minutes)

### Step 1: Navigate to Forms
1. Log in to [SalesIQ Dashboard](https://salesiq.zoho.com)
2. Click **Settings** (gear icon, top right)
3. In left sidebar, click **Forms**
4. Click **"+ Create Form"** button

### Step 2: Basic Form Settings
```
Form Name: Resume Upload Form
Form Type: Lead Generation
Description: Job application form with resume upload
```

### Step 3: Add Form Fields

**Field 1: Full Name**
```
Field Type: Text Input
Label: Full Name
Placeholder: Enter your full name
Required: ✅ Yes
Validation: None
```

**Field 2: Email Address**
```
Field Type: Email
Label: Email Address
Placeholder: your.email@example.com
Required: ✅ Yes
Validation: Email format
```

**Field 3: Phone Number**
```
Field Type: Phone
Label: Phone Number
Placeholder: +1 (555) 123-4567
Required: ✅ Yes
Validation: Phone format
Country Code: Auto-detect
```

**Field 4: Resume Upload** ⭐ **MOST IMPORTANT**
```
Field Type: File Upload
Label: Upload Resume
Required: ✅ Yes
Accepted File Types: .pdf, .doc, .docx
Maximum File Size: 5 MB
Help Text: Please upload your resume in PDF or Word format (max 5MB)
```

**Field 5: Position**
```
Field Type: Dropdown
Label: Position Applying For
Required: ✅ Yes
Options:
  - Software Engineer
  - Product Manager
  - UI/UX Designer
  - Data Scientist
  - Marketing Manager
  - Sales Executive
  - Other
Default: (None selected)
```

**Field 6: Cover Letter (Optional)**
```
Field Type: Textarea
Label: Cover Letter (Optional)
Required: ❌ No
Placeholder: Tell us why you're interested in this position
Max Length: 500 characters
Rows: 4
```

### Step 4: Form Settings

**Submit Button**
```
Button Text: Submit Application
Button Color: #0066FF (Blue)
```

**Success Message**
```
Message: Thank you for your application! 🎉

We've received your resume and will review it carefully. Our HR team will get back to you within 3-5 business days.

Good luck! 🍀
```

**After Submit Action**
```
Action: Show Success Message
Close Form After: 5 seconds
Redirect URL: (Leave empty)
```

**Notifications**
```
Send Email to: hr@yourcompany.com
Email Subject: New Job Application Received
Include Attachments: ✅ Yes (Resume file)
```

### Step 5: Save Form
1. Click **"Save"** button (top right)
2. Click **"Publish"** button
3. Confirm: "Yes, publish this form"

✅ **Form Created Successfully!**

---

## Part 2: Create the Bot (5 minutes)

### Step 1: Navigate to Bots
1. In SalesIQ Dashboard, click **Settings**
2. In left sidebar, click **Bots**
3. Click **"+ Create Bot"** button

### Step 2: Bot Basic Settings
```
Bot Name: Resume Form Trigger Bot
Bot Type: Trigger-based Bot
Description: Automatically shows resume upload form when triggered from mobile app
Status: Active ✅
```

### Step 3: Create Trigger #1 (Primary - Page Title)

Click **"Add Trigger"** button

```
Trigger Name: Mobile App Resume Trigger
Trigger Type: Page Visit
Priority: High

Conditions:
  Page Title [equals] "RESUME_FORM_TRIGGER"
  
  ⚠️ IMPORTANT: Must match EXACTLY (case-sensitive)
  Flutter app sends: 'RESUME_FORM_TRIGGER'
  Bot checks for: "RESUME_FORM_TRIGGER"
```

**Advanced Settings:**
```
Trigger Once Per Session: ❌ No (allow multiple triggers)
Delay: 0 seconds (immediate)
Apply to: All Visitors
```

### Step 4: Add Action to Trigger #1

Click **"Add Action"** under the trigger

```
Action Type: Show Form
Form: Resume Upload Form (select from dropdown)
Timing: Immediate (0 seconds)
Position: Center of chat window
```

**Optional: Add Welcome Message Before Form**
```
Message Type: Text
Message: Hi! 👋 I see you'd like to upload your resume. Let me help you with that!
Delay: 0 seconds
Show Before Form: ✅ Yes
```

### Step 5: Create Trigger #2 (Fallback - Visitor Info)

Click **"Add Trigger"** button again

```
Trigger Name: Resume Trigger by Visitor Info
Trigger Type: Visitor Information
Priority: Medium

Conditions:
  Custom Field "FormTrigger" [equals] "RESUME_UPLOAD"
  
  ⚠️ IMPORTANT: Field name is case-sensitive
  Flutter app sends: FormTrigger = "RESUME_UPLOAD"
  Bot checks for: FormTrigger equals "RESUME_UPLOAD"
```

**Advanced Settings:**
```
Trigger Once Per Session: ❌ No
Delay: 0 seconds
Apply to: All Visitors
```

### Step 6: Add Action to Trigger #2

Click **"Add Action"** under trigger #2

```
Action Type: Show Form
Form: Resume Upload Form
Timing: Immediate
```

### Step 7: Create Trigger #3 (Manual Fallback - Keyword)

Click **"Add Trigger"** button again

```
Trigger Name: Resume Upload Keyword
Trigger Type: Message Contains
Priority: Low

Conditions:
  Message contains any of:
    - "upload resume"
    - "apply job"
    - "resume"
    - "application"
    - "apply"
  
  Match Type: Case-insensitive
```

**Action:**
```
Action Type: Show Form
Form: Resume Upload Form
```

### Step 8: Bot Settings

**General Settings:**
```
Bot Avatar: (Upload company logo or use default)
Bot Display Name: HR Assistant
Bot Description: I help with job applications
```

**Availability:**
```
Active Hours: 24/7 (Always active)
Days: All days
Timezone: Your timezone
```

**Behavior:**
```
Show Bot Icon: ✅ Yes
Allow Handoff to Human: ✅ Yes (if user needs help)
Fallback Message: "I'm here to help with job applications. Type 'upload resume' to get started!"
```

### Step 9: Save and Publish Bot

1. Click **"Save"** button (top right)
2. Toggle **"Active"** switch to ON
3. Click **"Publish"** button
4. Confirm: "Yes, publish this bot"

✅ **Bot Created and Published Successfully!**

---

## Part 3: Verify Configuration (2 minutes)

### Checklist

**Form Verification:**
- [ ] Form name is "Resume Upload Form"
- [ ] Form has file upload field
- [ ] Form is published (not draft)
- [ ] Success message is configured
- [ ] Email notification is set up

**Bot Verification:**
- [ ] Bot name is "Resume Form Trigger Bot"
- [ ] Bot status is "Active" (toggle ON)
- [ ] Trigger #1: Page Title = "RESUME_FORM_TRIGGER"
- [ ] Trigger #2: FormTrigger = "RESUME_UPLOAD"
- [ ] Trigger #3: Keywords include "upload resume"
- [ ] All triggers have action: Show Form → Resume Upload Form
- [ ] Bot is published

**Integration Verification:**
- [ ] Flutter app has correct SalesIQ keys
- [ ] Flutter app sends page title: 'RESUME_FORM_TRIGGER'
- [ ] Flutter app sets visitor info: FormTrigger = 'RESUME_UPLOAD'
- [ ] Flutter app sets visitor email before opening chat

---

## Part 4: Test End-to-End (3 minutes)

### Test Flow

**Step 1: Open Flutter App**
```
Launch app on device/emulator
Wait for "SalesIQ Status: Initialized ✅"
```

**Step 2: Trigger Form**
```
Click "Open Chat & Trigger Resume Form" button
```

**Expected Result:**
```
✅ Chat window opens
✅ Welcome message appears (if configured)
✅ Resume Upload Form appears within 3 seconds
✅ Form has all fields (Name, Email, Phone, Resume Upload, Position)
```

**Step 3: Fill Form**
```
1. Enter name: "Test User"
2. Enter email: "test@example.com"
3. Enter phone: "+1234567890"
4. Upload resume: Select a PDF file
5. Select position: "Software Engineer"
6. (Optional) Add cover letter
7. Click "Submit Application"
```

**Expected Result:**
```
✅ Form submits successfully
✅ Success message appears
✅ Form closes after 5 seconds
```

**Step 4: Verify in Dashboard**
```
1. Go to SalesIQ Dashboard
2. Click "Visitors" → "Active Visitors"
3. Find your test visitor (by email)
4. Click to view details
```

**Expected Data:**
```
✅ Visitor Name: Test User
✅ Visitor Email: test@example.com
✅ Visitor Phone: +1234567890
✅ Custom Field: FormTrigger = RESUME_UPLOAD
✅ Page Title: RESUME_FORM_TRIGGER
✅ Form Submission: Resume Upload Form
✅ Attached File: Resume PDF
```

**Step 5: Check Email**
```
Check hr@yourcompany.com inbox
```

**Expected Email:**
```
Subject: New Job Application Received
Body: Contains applicant details
Attachment: Resume PDF file
```

---

## Part 5: Troubleshooting

### Issue: Form Doesn't Appear

**Check 1: Bot is Active**
```
Dashboard → Bots → Resume Form Trigger Bot
Status toggle: Should be ON (green)
If OFF, toggle ON and click "Publish"
```

**Check 2: Trigger Conditions Match**
```
Bot Trigger: Page Title equals "RESUME_FORM_TRIGGER"
Flutter Code: ZohoSalesIQ.setPageTitle('RESUME_FORM_TRIGGER')

⚠️ Must match EXACTLY (case-sensitive, no extra spaces)
```

**Check 3: Form is Published**
```
Dashboard → Forms → Resume Upload Form
Status: Should show "Published" (green badge)
If "Draft", click "Publish"
```

**Check 4: Visitor Email is Set**
```
Flutter app must call:
await ZohoSalesIQ.setVisitorEmail('user@example.com');
BEFORE calling:
ZohoSalesIQ.show();
```

### Issue: Form Appears But Submission Fails

**Check 1: Required Fields**
```
Ensure all required fields are filled:
- Name ✅
- Email ✅
- Phone ✅
- Resume File ✅
- Position ✅
```

**Check 2: File Size**
```
Resume file must be < 5 MB
If larger, compress or use different file
```

**Check 3: File Format**
```
Only these formats accepted:
- .pdf ✅
- .doc ✅
- .docx ✅

Not accepted:
- .txt ❌
- .jpg ❌
- .zip ❌
```

### Issue: Email Notification Not Received

**Check 1: Email Address**
```
Dashboard → Forms → Resume Upload Form → Settings
Notification Email: hr@yourcompany.com
Verify email is correct
```

**Check 2: Spam Folder**
```
Check spam/junk folder in email client
Add salesiq@zoho.com to safe senders
```

**Check 3: Email Enabled**
```
Dashboard → Forms → Resume Upload Form → Settings
"Send Email Notification" toggle: Should be ON
```

---

## Part 6: Advanced Configuration

### Multiple Forms

If you need different forms for different purposes:

**Form 1: Resume Upload**
```
Trigger: Page Title = "RESUME_FORM_TRIGGER"
Form: Resume Upload Form
```

**Form 2: Contact Us**
```
Trigger: Page Title = "CONTACT_FORM_TRIGGER"
Form: Contact Form
```

**Form 3: Feedback**
```
Trigger: Page Title = "FEEDBACK_FORM_TRIGGER"
Form: Feedback Form
```

**Flutter Code:**
```dart
// For resume form
ZohoSalesIQ.setPageTitle('RESUME_FORM_TRIGGER');

// For contact form
ZohoSalesIQ.setPageTitle('CONTACT_FORM_TRIGGER');

// For feedback form
ZohoSalesIQ.setPageTitle('FEEDBACK_FORM_TRIGGER');
```

### Conditional Forms

Show different forms based on user type:

**Bot Logic:**
```
IF Visitor Info "UserType" = "Job Applicant"
  THEN Show Resume Upload Form
ELSE IF Visitor Info "UserType" = "Customer"
  THEN Show Support Form
ELSE
  Show General Contact Form
```

**Flutter Code:**
```dart
// Set user type
await ZohoSalesIQ.setVisitorAddInfo('UserType', 'Job Applicant');

// Then trigger
ZohoSalesIQ.setPageTitle('FORM_TRIGGER');
```

---

## ✅ Configuration Complete!

You now have:
- ✅ Resume Upload Form with file upload
- ✅ Bot with 3 trigger methods (page title, visitor info, keywords)
- ✅ Email notifications to HR
- ✅ Complete testing procedure
- ✅ Troubleshooting guide

**Result: Reliable form triggering in mobile app** 🎉

---

## 📞 Need Help?

- **Documentation:** See `SALESIQ_MOBILE_FORM_TRIGGER_GUIDE.md`
- **Quick Start:** See `QUICK_START.md`
- **Zoho Support:** support@zohosalesiq.com
- **Community:** [SalesIQ Forum](https://help.zoho.com/portal/en/community/salesiq)
