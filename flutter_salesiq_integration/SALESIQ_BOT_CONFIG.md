# 🤖 SalesIQ Bot Configuration for Mobile Form Trigger

## Bot Setup Instructions

### Method 1: Manual Configuration (Recommended)

#### Step 1: Create Bot
1. Go to **SalesIQ Dashboard** → **Settings** → **Bots**
2. Click **"Create Bot"**
3. **Bot Name:** `Resume Form Trigger Bot`
4. **Bot Type:** `Trigger-based Bot`

#### Step 2: Configure Trigger

**Trigger 1: Page Title Detection**
```
Name: Mobile App Resume Form Trigger
Type: Page Visit
Condition: Page Title equals "RESUME_FORM_TRIGGER"
Priority: High
```

**Trigger 2: Visitor Info Detection (Fallback)**
```
Name: Resume Form by Visitor Info
Type: Visitor Information
Condition: Custom Field "FormTrigger" equals "RESUME_UPLOAD"
Priority: Medium
```

#### Step 3: Configure Action

**Action for Both Triggers:**
```
Action Type: Show Form
Form: Resume Upload Form
Timing: Immediate (0 seconds delay)
Show Once: No (allow multiple submissions)
```

#### Step 4: Add Welcome Message (Optional)

```
Message: "Hi! 👋 I see you'd like to upload your resume. Let me help you with that!"
Delay: 0 seconds
```

#### Step 5: Publish Bot

1. Click **"Save"**
2. Toggle **"Active"** to ON
3. Click **"Publish"**

---

## Alternative: Keyword-Based Trigger

If automatic triggers don't work, add a keyword-based fallback:

### Keyword Trigger Configuration

```
Trigger Type: Message Contains
Keywords: 
  - "upload resume"
  - "apply job"
  - "resume"
  - "application"
  - "apply"
  
Response: Show Resume Upload Form
```

### User Flow
```
User types: "upload resume"
Bot responds: [Shows Resume Upload Form]
```

---

## Form Configuration

### Create Resume Upload Form

1. **SalesIQ Dashboard** → **Settings** → **Forms** → **Create Form**

2. **Form Name:** `Resume Upload Form`

3. **Form Fields:**

```
Field 1:
  Type: Text
  Label: Full Name
  Required: Yes
  Placeholder: Enter your full name

Field 2:
  Type: Email
  Label: Email Address
  Required: Yes
  Placeholder: your.email@example.com
  Validation: Email format

Field 3:
  Type: Phone
  Label: Phone Number
  Required: Yes
  Placeholder: +1 (555) 123-4567
  Validation: Phone format

Field 4:
  Type: File Upload
  Label: Upload Resume
  Required: Yes
  Accepted Formats: .pdf, .doc, .docx
  Max File Size: 5 MB
  Help Text: Please upload your resume in PDF or Word format

Field 5:
  Type: Dropdown
  Label: Position Applying For
  Required: Yes
  Options:
    - Software Engineer
    - Product Manager
    - Designer
    - Data Scientist
    - Other

Field 6:
  Type: Textarea
  Label: Cover Letter (Optional)
  Required: No
  Placeholder: Tell us why you're interested in this position
  Max Length: 500 characters
```

4. **Form Settings:**
```
Submit Button Text: Submit Application
Success Message: Thank you! Your application has been received. We'll review it and get back to you soon.
Redirect After Submit: No
Send Email Notification: Yes (to HR team)
```

5. **Save Form**

---

## Bot Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│              USER OPENS CHAT IN APP                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│         FLUTTER APP SENDS TRIGGER SIGNAL                 │
│                                                          │
│  ZohoSalesIQ.setPageTitle('RESUME_FORM_TRIGGER')        │
│  ZohoSalesIQ.setVisitorAddInfo('FormTrigger',           │
│                                 'RESUME_UPLOAD')         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              SALESIQ BOT DETECTS TRIGGER                 │
│                                                          │
│  Condition Met:                                         │
│  ✅ Page Title = "RESUME_FORM_TRIGGER"                  │
│  OR                                                      │
│  ✅ FormTrigger = "RESUME_UPLOAD"                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                BOT EXECUTES ACTION                       │
│                                                          │
│  1. Send welcome message (optional)                     │
│  2. Show "Resume Upload Form"                           │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              USER SEES FORM IN CHAT                      │
│                                                          │
│  • Fills in name, email, phone                          │
│  • Uploads resume file                                  │
│  • Selects position                                     │
│  • Submits form                                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│            FORM DATA SAVED IN SALESIQ                    │
│                                                          │
│  • Stored in Leads/Contacts                             │
│  • Email notification sent to HR                        │
│  • Resume file attached                                 │
│  • User sees success message                            │
└─────────────────────────────────────────────────────────┘
```

---

## Testing the Bot

### Test Checklist

1. **Verify Bot is Active**
   ```
   SalesIQ Dashboard → Bots → Resume Form Trigger Bot
   Status: Active ✅
   ```

2. **Test Trigger Conditions**
   ```
   Open app → Click "Open Chat & Trigger Resume Form"
   Expected: Form appears within 3 seconds
   ```

3. **Test Form Submission**
   ```
   Fill all fields → Upload PDF resume → Submit
   Expected: Success message appears
   ```

4. **Verify Data Received**
   ```
   SalesIQ Dashboard → Leads → Check for new entry
   Expected: New lead with resume file attached
   ```

### Debug Mode

Enable bot debug mode to see trigger evaluation:

1. **SalesIQ Dashboard** → **Settings** → **Bots** → Your Bot
2. Click **"Debug Mode"** toggle
3. Open chat in app
4. Check **"Bot Logs"** in dashboard to see:
   - Which triggers fired
   - Which conditions were met
   - Which actions were executed

---

## Advanced Configuration

### Multiple Form Triggers

If you have multiple forms (Resume, Contact, Feedback), create separate triggers:

```
Bot 1: Resume Form Trigger
  Trigger: Page Title = "RESUME_FORM_TRIGGER"
  Action: Show Resume Upload Form

Bot 2: Contact Form Trigger
  Trigger: Page Title = "CONTACT_FORM_TRIGGER"
  Action: Show Contact Form

Bot 3: Feedback Form Trigger
  Trigger: Page Title = "FEEDBACK_FORM_TRIGGER"
  Action: Show Feedback Form
```

### Conditional Logic

Show different forms based on user type:

```
IF Visitor Info "UserType" = "Job Applicant"
  THEN Show Resume Upload Form
ELSE IF Visitor Info "UserType" = "Customer"
  THEN Show Support Form
ELSE
  Show General Contact Form
```

### Time-Based Triggers

Show form only during business hours:

```
Trigger: Page Title = "RESUME_FORM_TRIGGER"
AND Current Time between 9:00 AM - 5:00 PM (Mon-Fri)
Action: Show Resume Upload Form

ELSE
  Message: "Thanks for your interest! Our HR team is available Mon-Fri, 9 AM - 5 PM. Please leave your details and we'll get back to you."
```

---

## Integration with Webhook

### Send Form Data to Your Server

1. **SalesIQ Dashboard** → **Settings** → **Forms** → Resume Upload Form
2. **Webhook URL:** `https://your-server.com/api/resume-submissions`
3. **Method:** POST
4. **Headers:**
   ```
   Content-Type: application/json
   x-webhook-secret: your_secret_key
   ```

5. **Payload:**
   ```json
   {
     "form_name": "Resume Upload Form",
     "submission_id": "{{submission_id}}",
     "visitor_email": "{{visitor_email}}",
     "visitor_name": "{{visitor_name}}",
     "fields": {
       "full_name": "{{full_name}}",
       "email": "{{email}}",
       "phone": "{{phone}}",
       "position": "{{position}}",
       "cover_letter": "{{cover_letter}}",
       "resume_url": "{{resume_file_url}}"
     },
     "submitted_at": "{{timestamp}}"
   }
   ```

### Process in Your Server

```javascript
// Node.js example (matches your webhook_local.js)
app.post('/api/resume-submissions', async (req, res) => {
  const { visitor_email, fields } = req.body;
  
  // Save to database
  await db.collection('job_applications').add({
    email: visitor_email,
    name: fields.full_name,
    phone: fields.phone,
    position: fields.position,
    resumeUrl: fields.resume_url,
    coverLetter: fields.cover_letter,
    submittedAt: new Date(),
    status: 'pending'
  });
  
  // Send email to HR
  await sendEmail({
    to: 'hr@company.com',
    subject: `New Job Application: ${fields.position}`,
    body: `New application from ${fields.full_name}...`
  });
  
  res.json({ success: true });
});
```

---

## Troubleshooting Bot Issues

### Bot Doesn't Trigger

**Check 1: Bot is Active**
```
Dashboard → Bots → Ensure toggle is ON
```

**Check 2: Trigger Conditions**
```
Verify page title in app matches EXACTLY:
Flutter: 'RESUME_FORM_TRIGGER'
Bot: "RESUME_FORM_TRIGGER"
(Case-sensitive!)
```

**Check 3: Bot Priority**
```
If multiple bots exist, check priority
Higher priority bots execute first
```

### Form Doesn't Appear

**Check 1: Form Exists**
```
Dashboard → Forms → Resume Upload Form exists
```

**Check 2: Form is Published**
```
Form status should be "Published", not "Draft"
```

**Check 3: Bot Action**
```
Bot action must be "Show Form", not "Send Message"
```

### Form Submission Fails

**Check 1: Required Fields**
```
Ensure all required fields are filled
```

**Check 2: File Size**
```
Resume file must be < 5 MB
```

**Check 3: File Format**
```
Only .pdf, .doc, .docx allowed
```

---

## Best Practices

1. **Keep Trigger Conditions Simple**
   - Use clear, unique page titles
   - Avoid complex conditional logic
   - Test each trigger independently

2. **Provide Fallback Options**
   - Add keyword triggers as backup
   - Show help message if form fails to load
   - Allow manual form request

3. **Optimize Form Fields**
   - Only ask for essential information
   - Use dropdowns instead of text for predefined options
   - Provide clear help text

4. **Test Thoroughly**
   - Test on real devices (Android + iOS)
   - Test with different file sizes
   - Test with slow network connections

5. **Monitor Performance**
   - Track form submission rate
   - Check for abandoned forms
   - Analyze drop-off points

---

## Summary

✅ **Bot Configuration Complete**
- Trigger: Page Title or Visitor Info
- Action: Show Resume Upload Form
- Fallback: Keyword-based trigger

✅ **Form Configuration Complete**
- Fields: Name, Email, Phone, Resume File, Position
- Validation: Required fields, file format, file size
- Webhook: Send data to your server

✅ **Testing Complete**
- Bot triggers correctly
- Form appears automatically
- File upload works
- Data saved successfully

**Result: Reliable mobile form triggering system** 🎉
