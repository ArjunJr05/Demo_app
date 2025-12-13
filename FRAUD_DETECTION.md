# 🚨 Fraud Detection System Documentation

## Overview
The fraud detection system analyzes customer behavior patterns to calculate a risk score (0-100) based on multiple indicators including cancellation rates, return rates, issue frequency, and suspicious patterns.

---

## 📊 Fraud Score Calculation

### Total Score Range: **0-100 Points**

The fraud score is calculated using a weighted scoring system across 8 key indicators:

---

## 🎯 Risk Indicators & Scoring

### 1. **Cancellation Rate** (Max: 25 points)
Measures the percentage of orders that were cancelled by the customer.

**Formula:**
```
Cancel Rate = (Canceled Orders / Total Orders) × 100
```

**Scoring:**
- **>50%** → 25 points + Flag: "High cancellation rate"
- **>30%** → 15 points + Flag: "Elevated cancellation rate"
- **>15%** → 8 points
- **≤15%** → 0 points

**Example:**
- Total Orders: 10
- Canceled Orders: 6
- Cancel Rate: (6/10) × 100 = **60%**
- **Score: 25 points** ⚠️

---

### 2. **Return Rate** (Max: 20 points)
Measures the percentage of orders that were returned.

**Formula:**
```
Return Rate = (Return Issues / Total Orders) × 100
```

**Scoring:**
- **>40%** → 20 points + Flag: "High return rate"
- **>25%** → 12 points + Flag: "Elevated return rate"
- **>10%** → 6 points
- **≤10%** → 0 points

**Example:**
- Total Orders: 10
- Returns: 3
- Return Rate: (3/10) × 100 = **30%**
- **Score: 12 points** ⚠️

---

### 3. **Issue Rate** (Max: 15 points)
Measures the overall frequency of customer issues (complaints, returns, quality issues, etc.).

**Formula:**
```
Issue Rate = (Total Issues / Total Orders) × 100
```

**Scoring:**
- **>50%** → 15 points + Flag: "High issue rate"
- **>30%** → 10 points
- **>15%** → 5 points
- **≤15%** → 0 points

**Example:**
- Total Orders: 10
- Total Issues: 4
- Issue Rate: (4/10) × 100 = **40%**
- **Score: 10 points** ⚠️

---

### 4. **High-Value Cancellations** (Max: 15 points)
Counts cancellations of orders exceeding ₹5,000.

**Formula:**
```
High-Value Cancellations = Count of (Canceled Orders where Amount > ₹5000)
```

**Scoring:**
- **≥3 cancellations** → 15 points + Flag: "X high-value cancellations"
- **2 cancellations** → 10 points
- **1 cancellation** → 5 points
- **0 cancellations** → 0 points

**Example:**
- Canceled Orders: 4
- High-Value (>₹5000): 3 orders
- **Score: 15 points** ⚠️

---

### 5. **Rapid Order Pattern** (Max: 10 points)
Detects if 3 or more orders were placed within 24 hours.

**Formula:**
```
Time Span = Latest Order Time - 3rd Latest Order Time
If Time Span < 24 hours → Rapid Pattern Detected
```

**Scoring:**
- **3+ orders in 24 hours** → 10 points + Flag: "Rapid order placement detected"
- **Normal pattern** → 0 points

**Example:**
- Order 1: Dec 13, 2025 10:00 AM
- Order 2: Dec 13, 2025 2:00 PM
- Order 3: Dec 13, 2025 8:00 PM
- Time Span: 10 hours
- **Score: 10 points** ⚠️

---

### 6. **Address Changes** (Max: 10 points)
Detects frequent shipping address changes for customers with few orders.

**Formula:**
```
Unique Addresses = Count of distinct shipping addresses
If Unique Addresses > 3 AND Total Orders < 10 → Suspicious
```

**Scoring:**
- **>5 addresses** → 10 points + Flag: "Multiple addresses: X"
- **>3 addresses** → 6 points
- **≤3 addresses** → 0 points

**Example:**
- Total Orders: 8
- Unique Addresses: 6
- **Score: 10 points** ⚠️

---

### 7. **Payment Failures** (Max: 5 points)
Counts failed payment attempts.

**Formula:**
```
Payment Failures = Count of orders with paymentStatus = 'failed'
```

**Scoring:**
- **>3 failures** → 5 points + Flag: "X payment failures"
- **>1 failure** → 3 points
- **≤1 failure** → 0 points

**Example:**
- Total Orders: 10
- Failed Payments: 4
- **Score: 5 points** ⚠️

---

### 8. **Suspicious Time Pattern** (Max: 5 points)
Detects if more than 50% of orders are placed late night (12 AM - 5 AM).

**Formula:**
```
Late Night Orders = Count of orders placed between 00:00 - 05:00
If Late Night Orders > (Total Orders × 0.5) → Suspicious
```

**Scoring:**
- **>50% late night orders** → 5 points + Flag: "Unusual ordering time pattern"
- **≤50% late night orders** → 0 points

**Example:**
- Total Orders: 10
- Late Night Orders: 7
- Percentage: 70%
- **Score: 5 points** ⚠️

---

## 🎨 Risk Level Classification

Based on the total fraud score, customers are classified into risk levels:

| Score Range | Risk Level | Color | Action Recommended |
|-------------|------------|-------|-------------------|
| **0-14** | Minimal | 🟢 Green | No action needed |
| **15-29** | Low | 🟢 Green | Monitor activity |
| **30-49** | Medium | 🟡 Yellow | Review account |
| **50-69** | High | 🟠 Orange | Flag for investigation |
| **70-100** | Critical | 🔴 Red | Immediate review required |

---

## 📈 Complete Example Calculation

### Customer Profile:
- **Total Orders:** 10
- **Delivered Orders:** 4
- **Canceled Orders:** 4 (2 high-value >₹5000)
- **Return Issues:** 2
- **Other Issues:** 1
- **Payment Failures:** 2
- **Unique Addresses:** 4
- **Late Night Orders:** 3
- **Rapid Orders:** Yes (3 orders in 18 hours)

### Calculation:

1. **Cancel Rate:** (4/10) × 100 = 40% → **15 points**
2. **Return Rate:** (2/10) × 100 = 20% → **6 points**
3. **Issue Rate:** (3/10) × 100 = 30% → **10 points**
4. **High-Value Cancellations:** 2 → **10 points**
5. **Rapid Order Pattern:** Yes → **10 points**
6. **Address Changes:** 4 addresses → **6 points**
7. **Payment Failures:** 2 → **3 points**
8. **Suspicious Time:** 30% late night → **0 points**

### **Total Fraud Score: 60/100**
### **Risk Level: HIGH (Orange)** 🟠

### Flags Generated:
- ✓ Elevated cancellation rate: 40.0%
- ✓ 2 high-value cancellations
- ✓ Rapid order placement detected
- ✓ Multiple addresses: 4

---

## 🔄 Dynamic Updates

The fraud score is **recalculated automatically** whenever:
- A new order is placed
- An order is canceled
- A return/issue is created
- Payment status changes
- Customer data is refreshed in the widget

This ensures the risk assessment is always current and reflects the latest customer behavior.

---

## 📱 Widget Display

### In Customer Analytics Section:
```
Fraud Risk: 60/100 - High
```

### In Fraud Details Section (if score ≥ 30):
```
🚨 Fraud Risk Details
Risk Level: High
Cancel Rate: 40.0%
Return Rate: 20.0%
Issue Rate: 30.0%
Flags: Elevated cancellation rate: 40.0%, 2 high-value cancellations, Rapid order placement detected, Multiple addresses: 4
```

---

## 🛡️ Best Practices

### For Low Risk Customers (0-29):
- ✅ Normal processing
- ✅ Standard shipping
- ✅ Full refund policy

### For Medium Risk Customers (30-49):
- ⚠️ Monitor order patterns
- ⚠️ Verify high-value orders
- ⚠️ Consider requiring signature on delivery

### For High Risk Customers (50-69):
- 🔶 Manual review before shipping
- 🔶 Require payment confirmation
- 🔶 Limit order value or quantity
- 🔶 Contact customer for verification

### For Critical Risk Customers (70-100):
- 🔴 Hold orders for review
- 🔴 Require additional verification (ID, address proof)
- 🔴 Prepayment only (no COD)
- 🔴 Consider account suspension

---

## 🔧 Technical Implementation

### Data Structure:
```javascript
{
  fraudScore: 60,              // 0-100
  riskLevel: "High",           // Minimal, Low, Medium, High, Critical
  riskColor: "orange",         // grey, green, yellow, orange, red
  indicators: {
    cancelRate: 40.0,
    returnRate: 20.0,
    issueRate: 30.0,
    highValueCancellations: 2,
    rapidOrderPattern: 1,
    addressChanges: 4,
    paymentFailures: 2,
    suspiciousTimePattern: 0
  },
  flags: [
    "Elevated cancellation rate: 40.0%",
    "2 high-value cancellations",
    "Rapid order placement detected",
    "Multiple addresses: 4"
  ],
  totalOrders: 10,
  canceledCount: 4,
  returnCount: 2,
  issueCount: 3
}
```

---

## 📝 Notes

- **Minimum Data Required:** At least 1 order to calculate meaningful scores
- **New Customers:** Score = 0, Risk Level = "Unknown" until first order
- **Positive Indicators:** Customers with score < 30 and 5+ orders get "Good order history" flag
- **Real-time Updates:** Score recalculates on every widget load with latest data
- **Privacy:** Fraud scores are internal and not displayed to customers

---

## 🎓 Understanding the System

This fraud detection system uses a **behavioral analysis approach** rather than traditional rule-based systems. It:

1. **Analyzes patterns** across multiple dimensions
2. **Weights indicators** based on fraud risk correlation
3. **Adapts dynamically** as customer behavior changes
4. **Provides actionable insights** through flags and risk levels
5. **Balances sensitivity** to catch fraud while minimizing false positives

The system is designed to be **transparent**, **explainable**, and **fair** - every score can be traced back to specific customer actions and behaviors.

---

**Last Updated:** December 14, 2025  
**Version:** 1.0.0
