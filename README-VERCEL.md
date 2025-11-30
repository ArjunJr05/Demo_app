# 🚀 SalesIQ Customer Webhook - Vercel Deployment

A serverless webhook for SalesIQ customer data integration, optimized for Vercel deployment.

## 📁 Project Structure

```
salesiq/
├── api/
│   └── webhook.js          # Vercel serverless function
├── vercel.json            # Vercel configuration
├── package.json           # Dependencies and scripts
└── README-VERCEL.md       # This file
```

## 🛠️ Setup & Deployment

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Deploy to Vercel

```bash
# From your project directory
cd c:\Users\arjun\salesiq

# Deploy to production
vercel --prod
```

### 4. Alternative: Deploy via GitHub

1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Vercel will auto-deploy on every push

## 🔗 Webhook URLs

After deployment, your webhook will be available at:

- **Main endpoint**: `https://your-project.vercel.app/api/webhook`
- **Typo support**: `https://your-project.vercel.app/webhook` (redirects to main)
- **Typo support**: `https://your-project.vercel.app/webook` (redirects to main)

## ⚙️ SalesIQ Configuration

1. Go to your SalesIQ dashboard
2. Navigate to Settings → Developer Space → Webhooks
3. Set webhook URL to: `https://your-project.vercel.app/api/webhook`
4. Method: **POST**
5. Events: Select the events you want to track

## 🧪 Testing Your Webhook

### Test locally with Vercel CLI:

```bash
# Start local development server
vercel dev

# Your webhook will be available at:
# http://localhost:3000/api/webhook
```

### Test the deployed webhook:

```bash
curl -X POST https://your-project.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "handler": "widget_detail",
    "context": {
      "data": {
        "name": "Priya",
        "email": "priya@gmail.com"
      }
    }
  }'
```

## 📊 Features

- ✅ **Serverless**: No server management required
- ✅ **Auto-scaling**: Handles traffic spikes automatically
- ✅ **Global CDN**: Fast response times worldwide
- ✅ **CORS enabled**: Works with SalesIQ from any domain
- ✅ **Error handling**: Graceful error responses
- ✅ **Logging**: Console logs for debugging

## 🔧 Environment Variables

No environment variables required for basic setup. All customer data is included in the code for demo purposes.

For production, you might want to add:

```bash
# In Vercel dashboard or via CLI
vercel env add DATABASE_URL
vercel env add API_KEY
```

## 📝 Customer Data

The webhook includes demo data for:

- **priya@gmail.com** - Sample customer with multiple orders
- **sarathy@gmail.com** - Sample customer with single order  
- **customer@example.com** - Flutter app customer data
- **Default fallback** - For any other email

## 🚨 Important Notes

1. **No Express.js**: Vercel functions don't use Express
2. **ES Modules**: Uses `export default` syntax
3. **Stateless**: Each request is independent
4. **Cold starts**: First request might be slower
5. **Timeout**: Functions timeout after 10 seconds (hobby plan)

## 📈 Monitoring

- **Vercel Dashboard**: View function logs and analytics
- **Console logs**: Available in Vercel function logs
- **Error tracking**: Automatic error capture

## 🔄 Updates

To update your webhook:

1. Modify `api/webhook.js`
2. Run `vercel --prod` or push to GitHub
3. Vercel will automatically redeploy

## 💡 Tips

- Use `vercel dev` for local testing
- Check Vercel function logs for debugging
- Test with SalesIQ preview mode
- Monitor function performance in Vercel dashboard

## 🆘 Troubleshooting

### Common Issues:

1. **404 Error**: Check your webhook URL configuration
2. **CORS Error**: Headers are configured in `vercel.json`
3. **Timeout**: Function takes too long (>10s on hobby plan)
4. **Cold Start**: First request after idle period is slower

### Debug Steps:

1. Check Vercel function logs
2. Test with `curl` command above
3. Verify SalesIQ webhook configuration
4. Use `vercel dev` for local testing

## 📞 Support

- Vercel Docs: https://vercel.com/docs
- SalesIQ Docs: https://www.zoho.com/salesiq/help/
- GitHub Issues: Create an issue in your repository
