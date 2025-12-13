// 🚨 FRAUD DETECTION SYSTEM
/**
 * Calculate fraud risk score based on customer behavior patterns
 * @param {Object} customerData - Complete customer data including orders, issues, etc.
 * @returns {Object} Fraud detection result with score, risk level, and flags
 */
function calculateFraudScore(customerData) {
  const { orders = [], deliveredOrders = [], issues = [], analytics = {} } = customerData;
  
  // Initialize fraud indicators
  const fraudIndicators = {
    cancelRate: 0,
    returnRate: 0,
    issueRate: 0,
    highValueCancellations: 0,
    rapidOrderPattern: 0,
    addressChanges: 0,
    paymentFailures: 0,
    suspiciousTimePattern: 0
  };
  
  const totalOrders = orders.length + deliveredOrders.length;
  
  if (totalOrders === 0) {
    return {
      fraudScore: 0,
      riskLevel: 'Unknown',
      riskColor: 'grey',
      indicators: fraudIndicators,
      flags: ['New customer - insufficient data']
    };
  }
  
  // 1. Calculate cancellation rate
  const canceledOrders = orders.filter(o => 
    o.status === 'Cancelled' || 
    o.status === 'OrderStatus.cancelled' ||
    o.status === 'canceled'
  );
  fraudIndicators.cancelRate = (canceledOrders.length / totalOrders) * 100;
  
  // 2. Calculate return rate from issues
  const returnIssues = issues.filter(i => 
    i.issueType === 'Order Return' || 
    i.issueType === 'Return' ||
    i.issueType === 'return'
  );
  fraudIndicators.returnRate = (returnIssues.length / totalOrders) * 100;
  
  // 3. Calculate overall issue rate
  fraudIndicators.issueRate = (issues.length / totalOrders) * 100;
  
  // 4. Check for high-value cancellations (orders > ₹5000)
  fraudIndicators.highValueCancellations = canceledOrders.filter(o => 
    o.totalAmount > 5000
  ).length;
  
  // 5. Detect rapid order pattern (multiple orders in short time)
  if (orders.length >= 3) {
    const sortedOrders = [...orders].sort((a, b) => 
      new Date(b.orderDate) - new Date(a.orderDate)
    );
    
    // Check if 3+ orders placed within 24 hours
    const recentOrders = sortedOrders.slice(0, 3);
    const timeSpan = new Date(recentOrders[0].orderDate) - new Date(recentOrders[2].orderDate);
    const hoursSpan = timeSpan / (1000 * 60 * 60);
    
    if (hoursSpan < 24) {
      fraudIndicators.rapidOrderPattern = 1;
    }
  }
  
  // 6. Check for address inconsistencies
  const uniqueAddresses = new Set();
  [...orders, ...deliveredOrders].forEach(o => {
    if (o.shippingAddress) {
      uniqueAddresses.add(JSON.stringify(o.shippingAddress));
    }
  });
  
  if (uniqueAddresses.size > 3 && totalOrders < 10) {
    fraudIndicators.addressChanges = uniqueAddresses.size;
  }
  
  // 7. Check payment failures
  const paymentFailures = orders.filter(o => 
    o.paymentStatus === 'failed' || 
    o.paymentStatus === 'PaymentStatus.failed'
  );
  fraudIndicators.paymentFailures = paymentFailures.length;
  
  // 8. Check for suspicious time patterns (many orders late night 12am-5am)
  const lateNightOrders = [...orders, ...deliveredOrders].filter(o => {
    const hour = new Date(o.orderDate).getHours();
    return hour >= 0 && hour < 5;
  });
  
  if (lateNightOrders.length > totalOrders * 0.5) {
    fraudIndicators.suspiciousTimePattern = 1;
  }
  
  // Calculate weighted fraud score (0-100)
  let fraudScore = 0;
  const flags = [];
  
  // Weight: Cancel rate (max 25 points)
  if (fraudIndicators.cancelRate > 50) {
    fraudScore += 25;
    flags.push(`High cancellation rate: ${fraudIndicators.cancelRate.toFixed(1)}%`);
  } else if (fraudIndicators.cancelRate > 30) {
    fraudScore += 15;
    flags.push(`Elevated cancellation rate: ${fraudIndicators.cancelRate.toFixed(1)}%`);
  } else if (fraudIndicators.cancelRate > 15) {
    fraudScore += 8;
  }
  
  // Weight: Return rate (max 20 points)
  if (fraudIndicators.returnRate > 40) {
    fraudScore += 20;
    flags.push(`High return rate: ${fraudIndicators.returnRate.toFixed(1)}%`);
  } else if (fraudIndicators.returnRate > 25) {
    fraudScore += 12;
    flags.push(`Elevated return rate: ${fraudIndicators.returnRate.toFixed(1)}%`);
  } else if (fraudIndicators.returnRate > 10) {
    fraudScore += 6;
  }
  
  // Weight: Issue rate (max 15 points)
  if (fraudIndicators.issueRate > 50) {
    fraudScore += 15;
    flags.push(`High issue rate: ${fraudIndicators.issueRate.toFixed(1)}%`);
  } else if (fraudIndicators.issueRate > 30) {
    fraudScore += 10;
  } else if (fraudIndicators.issueRate > 15) {
    fraudScore += 5;
  }
  
  // Weight: High-value cancellations (max 15 points)
  if (fraudIndicators.highValueCancellations >= 3) {
    fraudScore += 15;
    flags.push(`${fraudIndicators.highValueCancellations} high-value cancellations`);
  } else if (fraudIndicators.highValueCancellations >= 2) {
    fraudScore += 10;
  } else if (fraudIndicators.highValueCancellations >= 1) {
    fraudScore += 5;
  }
  
  // Weight: Rapid order pattern (max 10 points)
  if (fraudIndicators.rapidOrderPattern) {
    fraudScore += 10;
    flags.push('Rapid order placement detected');
  }
  
  // Weight: Address changes (max 10 points)
  if (fraudIndicators.addressChanges > 5) {
    fraudScore += 10;
    flags.push(`Multiple addresses: ${fraudIndicators.addressChanges}`);
  } else if (fraudIndicators.addressChanges > 3) {
    fraudScore += 6;
  }
  
  // Weight: Payment failures (max 5 points)
  if (fraudIndicators.paymentFailures > 3) {
    fraudScore += 5;
    flags.push(`${fraudIndicators.paymentFailures} payment failures`);
  } else if (fraudIndicators.paymentFailures > 1) {
    fraudScore += 3;
  }
  
  // Weight: Suspicious time pattern (max 5 points)
  if (fraudIndicators.suspiciousTimePattern) {
    fraudScore += 5;
    flags.push('Unusual ordering time pattern');
  }
  
  // Determine risk level and color
  let riskLevel, riskColor;
  if (fraudScore >= 70) {
    riskLevel = 'Critical';
    riskColor = 'red';
  } else if (fraudScore >= 50) {
    riskLevel = 'High';
    riskColor = 'orange';
  } else if (fraudScore >= 30) {
    riskLevel = 'Medium';
    riskColor = 'yellow';
  } else if (fraudScore >= 15) {
    riskLevel = 'Low';
    riskColor = 'green';
  } else {
    riskLevel = 'Minimal';
    riskColor = 'green';
  }
  
  // Add positive indicators if low risk
  if (fraudScore < 30 && totalOrders >= 5) {
    flags.push('Good order history');
  }
  
  if (flags.length === 0) {
    flags.push('No fraud indicators detected');
  }
  
  return {
    fraudScore: Math.round(fraudScore),
    riskLevel,
    riskColor,
    indicators: fraudIndicators,
    flags,
    totalOrders,
    canceledCount: canceledOrders.length,
    returnCount: returnIssues.length,
    issueCount: issues.length
  };
}

module.exports = { calculateFraudScore };
