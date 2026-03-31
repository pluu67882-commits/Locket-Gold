#Locket Gold v1.1 - Author HoangPhu

const url = $request.url;
let obj = JSON.parse($response.body || "{}");
const appId = "com.locket.gold.yearly";
const expireDate = "2035-12-31T23:59:59Z";
const expireMs = 2082758400000;
const rid = "30000" + Math.floor(Math.random() * 100000000);

const goldData = {
"expires_date": expireDate,
"purchase_date": "2026-01-15T08:30:00Z",
"original_purchase_date": "2026-01-15T08:30:00Z",
"ownership_type": "PURCHASED",
"store": "app_store",
"is_sandbox": false,
"product_identifier": appId,
"original_transaction_id": rid,
"transaction_id": rid,
"period_type": "active"
};

try {
if (url.includes("api.revenuecat.com")) {
obj.subscriber = obj.subscriber || {};
obj.subscriber.entitlements = obj.subscriber.entitlements || {};
obj.subscriber.subscriptions = obj.subscriber.subscriptions || {};
obj.subscriber.entitlements["gold"] = goldData;
obj.subscriber.entitlements["premium"] = goldData;
obj.subscriber.subscriptions[appId] = goldData;
obj.subscriber.request_date = new Date().toISOString();
}
if (url.includes("/v1/users/self")) {
if (obj.data) {
obj.data.is_gold = true;
obj.data.premium_status = "active";
obj.data.is_premium = true;
obj.data.subscriptions = obj.data.subscriptions || [];
obj.data.subscriptions.push({
"product_id": appId,
"expires_date_ms": expireMs,
"status": "active",
"is_active": true
});
obj.data.receipt_validation_status = "valid";
}
}
$done({ body: JSON.stringify(obj) });
} catch (e) {
$done({});
}
