# 🚀 Vercel Deployment Checklist

## ✅ Pre-Deployment Setup

- [ ] **Install Vercel CLI**: `npm install -g vercel`
- [ ] **Login to Vercel**: `vercel login`
- [ ] **Verify file structure**:
  ```
  salesiq/
  ├── api/
  │   └── webhook.js          ✅ Serverless function
  ├── vercel.json            ✅ Vercel configuration
  ├── package.json           ✅ Updated for Vercel
  └── README-VERCEL.md       ✅ Documentation
  ```

## 🛠️ Deployment Steps

### Option 1: Direct Deployment

1. [ ] **Navigate to project directory**:
   ```bash
   cd c:\Users\arjun\salesiq
   ```

2. [ ] **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

3. [ ] **Note your deployment URL** (e.g., `https://salesiq-webhook.vercel.app`)

### Option 2: GitHub Integration

1. [ ] **Push code to GitHub**:
   ```bash
   git add .
   git commit -m "Add Vercel serverless webhook"
   git push origin main
   ```

2. [ ] **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will auto-deploy

## 🔧 Post-Deployment Configuration

### 1. Test Your Webhook

- [ ] **Test GET endpoint**:
  ```bash
  curl https://your-project.vercel.app/api/webhook
  ```

- [ ] **Test POST webhook**:
  ```bash
  curl -X POST https://your-project.vercel.app/api/webhook \
    -H "Content-Type: application/json" \
    -d '{"handler":"widget_detail","context":{"data":{"name":"Priya","email":"priya@gmail.com"}}}'
  ```

- [ ] **Run test script**:
  ```bash
  node test-vercel-webhook.js https://your-project.vercel.app/api/webhook
  ```

### 2. Configure SalesIQ

- [ ] **Go to SalesIQ Dashboard**
- [ ] **Navigate to**: Settings → Developer Space → Webhooks
- [ ] **Add new webhook**:
  - **URL**: `https://your-project.vercel.app/api/webhook`
  - **Method**: POST
  - **Events**: Select relevant events
- [ ] **Test webhook** in SalesIQ preview mode

### 3. Update Flutter App (Optional)

If you want to sync real orders from your Flutter app:

- [ ] **Update ECommerceService webhook URL**:
  ```dart
  static const String _webhookUrl = 'https://your-project.vercel.app';
  ```

## 🧪 Testing Checklist

- [ ] **Webhook responds to GET requests** (info page)
- [ ] **Webhook responds to POST requests** (SalesIQ data)
- [ ] **CORS headers work** (no browser errors)
- [ ] **Customer data displays correctly** in SalesIQ
- [ ] **Error handling works** (invalid requests)
- [ ] **All demo customers work**:
  - [ ] priya@gmail.com
  - [ ] sarathy@gmail.com  
  - [ ] customer@example.com
  - [ ] Unknown customers (fallback data)

## 📊 Monitoring Setup

- [ ] **Check Vercel Dashboard**:
  - Functions tab shows your webhook
  - No deployment errors
  - Function logs are accessible

- [ ] **Monitor function performance**:
  - Response times < 1 second
  - No timeout errors
  - Memory usage is reasonable

## 🔄 Maintenance

### Regular Checks

- [ ] **Weekly**: Check Vercel function logs for errors
- [ ] **Monthly**: Review function performance metrics
- [ ] **As needed**: Update customer data in webhook

### Updates

- [ ] **Code changes**: Push to GitHub or run `vercel --prod`
- [ ] **Environment variables**: Use Vercel dashboard
- [ ] **Domain changes**: Update SalesIQ webhook URL

## 🚨 Troubleshooting

### Common Issues

- [ ] **404 Error**: 
  - ✅ Check webhook URL in SalesIQ
  - ✅ Verify Vercel deployment succeeded
  - ✅ Test with curl command

- [ ] **CORS Error**:
  - ✅ Check `vercel.json` headers configuration
  - ✅ Verify function returns proper CORS headers

- [ ] **Timeout Error**:
  - ✅ Function takes too long (>10s on hobby plan)
  - ✅ Optimize customer data lookup
  - ✅ Consider upgrading Vercel plan

- [ ] **No Data Showing**:
  - ✅ Check SalesIQ webhook configuration
  - ✅ Verify customer email in demo data
  - ✅ Check Vercel function logs

### Debug Steps

1. [ ] **Check Vercel function logs**
2. [ ] **Test with curl commands**
3. [ ] **Verify SalesIQ webhook settings**
4. [ ] **Use `vercel dev` for local testing**

## 🎉 Success Criteria

Your deployment is successful when:

- [ ] ✅ Webhook URL responds to both GET and POST
- [ ] ✅ SalesIQ shows customer data widget
- [ ] ✅ All demo customers display correctly
- [ ] ✅ No errors in Vercel function logs
- [ ] ✅ Response times are under 2 seconds
- [ ] ✅ CORS works without browser errors

## 📞 Support Resources

- **Vercel Docs**: https://vercel.com/docs/functions
- **SalesIQ Webhooks**: https://www.zoho.com/salesiq/help/developer-section/webhooks.html
- **Your webhook URL**: `https://your-project.vercel.app/api/webhook`

---

**Next Steps**: Once deployed, update your SalesIQ webhook URL and test with real customer interactions!
