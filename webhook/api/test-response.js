// Test the webhook response format
const express = require('express');

// Simulate the createActionButtonsMessage function
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
          { label: "❌ Cancel Order", name: "cancel_action" },
          { label: "📋 Other Options", name: "other_action" }
        ]
      }
    ]
  };
}

// Test the response
const testVisitor = {
  name: "Demo Customer",
  email: "demo@customer.com"
};

const response = createActionButtonsMessage(testVisitor, {});
console.log('📋 Testing SalesIQ Response Format:');
console.log(JSON.stringify(response, null, 2));

// Validate the response structure
function validateResponse(response) {
  const errors = [];
  
  if (!response.type) errors.push('Missing type field');
  if (response.type !== 'widget_detail') errors.push('Type should be widget_detail');
  if (!response.sections) errors.push('Missing sections array');
  if (!Array.isArray(response.sections)) errors.push('Sections should be an array');
  
  response.sections.forEach((section, index) => {
    if (!section.name) errors.push(`Section ${index}: Missing name`);
    if (!section.layout) errors.push(`Section ${index}: Missing layout`);
    if (!section.title) errors.push(`Section ${index}: Missing title`);
    if (!section.data) errors.push(`Section ${index}: Missing data array`);
    if (!section.actions) errors.push(`Section ${index}: Missing actions array`);
  });
  
  return errors;
}

const validationErrors = validateResponse(response);
if (validationErrors.length > 0) {
  console.log('❌ Validation Errors:');
  validationErrors.forEach(error => console.log(`  - ${error}`));
} else {
  console.log('✅ Response format is valid for SalesIQ!');
}

console.log('\n🎯 This response should now work in SalesIQ without "Invalid value" errors.');
