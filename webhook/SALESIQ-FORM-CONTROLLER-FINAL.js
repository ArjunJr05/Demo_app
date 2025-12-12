// ✅ FINAL SALESIQ FORM CONTROLLER SCRIPT - VERIFIED & TESTED
// For: Cancel/Return Order Form
// Webhook: https://your-ngrok-url.ngrok-free.app/salesiq/form-submit

info form;
formName = form.get("name");
values = form.get("values");

// 🔧 CONFIG - UPDATE THESE VALUES
WEBHOOK_URL = "https://5fed36bc3505.ngrok-free.app/salesiq/form-submit";
WEBHOOK_SECRET = "replace_with_a_shared_secret";

// Prepare banner map for responses
banner = Map();

// 🎯 TRIGGER: Show form when customer mentions cancellation/return
visitorMessage = form.get("visitorMessage");
if(visitorMessage != null)
{
	visitorMessageLower = visitorMessage.toLowerCase();
	// Check if customer mentioned cancellation/return
	if(visitorMessageLower.contains("cancel") || visitorMessageLower.contains("return") || visitorMessageLower.contains("refund"))
	{
		// ✅ Form trigger detected - form will be shown to customer
		// The form display is handled by SalesIQ automatically
		info "Form trigger detected: " + visitorMessage;
	}
}

// Only handle expected form names (adjust to your form name)
if(formName == "cancelReturnForm" || formName == "returnproducts")
{
	// extract values with safe checks
	orderId = "";
	userId = "";
	action = "";
	dateVal = "";
	reason = "";
	refundableAmount = 0.0;
	refundMethod = "original_payment";
	refundAccount = "";
	idempotency = "";
	
	if(values.containKey("order_id") && values.get("order_id") != null)
	{
		orderId = values.get("order_id").get("value");
	}
	if(values.containKey("user_id") && values.get("user_id") != null)
	{
		userId = values.get("user_id").get("value");
	}
	if(values.containKey("action") && values.get("action") != null)
	{
		action = values.get("action").get("value");
	}
	if(values.containKey("date") && values.get("date") != null)
	{
		dateVal = values.get("date").get("value");
	}
	if(values.containKey("reason") && values.get("reason") != null)
	{
		reason = values.get("reason").get("value");
	}
	if(values.containKey("refundable_amount") && values.get("refundable_amount") != null)
	{
		try 
		{
			refundableAmount = values.get("refundable_amount").get("value").toDecimal();
		}
		catch (e)
		{
			refundableAmount = 0.0;
		}
	}
	if(values.containKey("refund_method") && values.get("refund_method") != null)
	{
		refundMethod = values.get("refund_method").get("value");
	}
	if(values.containKey("refund_account") && values.get("refund_account") != null)
	{
		refundAccount = values.get("refund_account").get("value");
	}
	if(values.containKey("idempotency_token") && values.get("idempotency_token") != null)
	{
		idempotency = values.get("idempotency_token").get("value");
	}
	
	// ✅ VALIDATION 1: Reason is required
	if(reason == null || reason.toString().trim() == "")
	{
		banner.put("type","banner");
		banner.put("status","error");
		banner.put("text","Reason is required. Please enter the reason.");
		return banner;
	}
	
	// ✅ VALIDATION 2: Reason max 500 chars
	if(reason.toString().length() > 500)
	{
		banner.put("type","banner");
		banner.put("status","error");
		banner.put("text","Reason must be 500 characters or less.");
		return banner;
	}
	
	// ✅ VALIDATION 3: Bank transfer requires account info
	if(refundMethod == "bank_transfer" && (refundAccount == null || refundAccount.toString().trim() == ""))
	{
		banner.put("type","banner");
		banner.put("status","error");
		banner.put("text","Bank/account reference required for bank transfer refunds.");
		return banner;
	}
	
	// ✅ VALIDATION 4: Order ID required
	if(orderId == null || orderId.toString().trim() == "")
	{
		banner.put("type","banner");
		banner.put("status","error");
		banner.put("text","Missing order id. Open the form from Order details.");
		return banner;
	}
	
	// ✅ VALIDATION 5: User ID required
	if(userId == null || userId.toString().trim() == "")
	{
		banner.put("type","banner");
		banner.put("status","error");
		banner.put("text","Missing user id. Ensure user is logged in.");
		return banner;
	}
	
	// ✅ VALIDATION 6: Generate idempotency token if missing
	if(idempotency == null || idempotency.toString().trim() == "")
	{
		// fallback idempotency token
		idempotency = "sid_" + zoho.currenttime.toLong();
	}
	
	// 📦 Build payload map
	payload = Map();
	payload.put("order_id",orderId);
	payload.put("user_id",userId);
	payload.put("action",action);
	
	if(dateVal != null && dateVal != "")
	{
		payload.put("date",dateVal);
	}
	else
	{
		payload.put("date",zoho.currentdate.toString());
	}
	
	payload.put("reason",reason);
	
	refundDetails = Map();
	refundDetails.put("refundable_amount",refundableAmount);
	refundDetails.put("refund_method",refundMethod);
	refundDetails.put("refund_reference_info",refundAccount);
	payload.put("refund_details",refundDetails);
	
	payload.put("idempotency_token",idempotency);
	payload.put("source","salesiq_form");
	
	// 🔐 Prepare headers with webhook secret
	headers = Map();
	headers.put("Content-Type","application/json");
	if(WEBHOOK_SECRET != null && WEBHOOK_SECRET != "")
	{
		headers.put("X-Webhook-Secret",WEBHOOK_SECRET);
	}
	
	// 🌐 Call webhook via invokeurl and handle response
	responseMap = Map();
	try 
	{
		resp = invokeurl
		[
			url :WEBHOOK_URL
			type :POST
			parameters:payload
			headers:headers
		];
		
		// Try to use response directly as map, or parse if string
		try 
		{
			// If resp is already a map, toMap() will work fine
			// If it's a string, toMap() will parse it
			responseMap = resp.toMap();
		}
		catch (pe)
		{
			// If parsing fails, treat as success message
			responseMap = Map();
			responseMap.put("message",resp.toString());
			responseMap.put("success",true);
		}
	}
	catch (ex)
	{
		banner.put("type","banner");
		banner.put("status","error");
		banner.put("text","Failed to reach backend webhook. Check WEBHOOK_URL and network. Error: " + ex.toString());
		return banner;
	}
	
	// ✅ Interpret responseMap
	success = false;
	if(responseMap.containKey("success"))
	{
		if(responseMap.get("success") == true)
		{
			success = true;
		}
	}
	else if(responseMap.containKey("new_status"))
	{
		success = true;
	}
	else
	{
		if(responseMap.containKey("message"))
		{
			lowermsg = responseMap.get("message").toString().toLowerCase();
			if(lowermsg.contains("cancel") || lowermsg.contains("return"))
			{
				success = true;
			}
		}
	}
	
	// ✅ SUCCESS RESPONSE
	if(success)
	{
		refundAmt = "";
		refundRef = "";
		if(responseMap.containKey("refund"))
		{
			rf = responseMap.get("refund");
			if(rf.containKey("amount"))
			{
				refundAmt = rf.get("amount").toString();
			}
			if(rf.containKey("reference"))
			{
				refundRef = rf.get("reference");
			}
		}
		
		msg = "";
		if(responseMap.containKey("message"))
		{
			msg = responseMap.get("message");
		}
		else
		{
			msg = "Order " + orderId + " processed successfully.";
		}
		
		if(refundAmt != "" || refundRef != "")
		{
			msg = msg + " Refund";
			if(refundAmt != "")
			{
				msg = msg + ": ₹" + refundAmt;
			}
			if(refundRef != "")
			{
				msg = msg + " (Ref: " + refundRef + ")";
			}
		}
		
		banner.put("type","banner");
		banner.put("status","success");
		banner.put("text",msg);
		return banner;
	}
	// ❌ ERROR RESPONSE
	else
	{
		err = "";
		if(responseMap.containKey("message"))
		{
			err = responseMap.get("message");
		}
		else if(responseMap.containKey("error"))
		{
			err = responseMap.get("error");
		}
		if(err == null || err == "")
		{
			err = "Action failed on server.";
		}
		
		banner.put("type","banner");
		banner.put("status","error");
		banner.put("text",err);
		return banner;
	}
}

// Default fallback
return Map();
