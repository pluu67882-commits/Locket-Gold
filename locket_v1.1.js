# Locket Gold v1.1 - Author HoangPhu

const url = $request.url;
let obj = JSON.parse($response.body || "{}");

const userId = obj.subscriber?.original_app_user_id || "HoangPhu_Dev";
const seed = userId.split('').reduce((a, b) => (Math.imul(31, a) + b.charCodeAt(0)) | 0, 0);
const createRNG = (s) => () => (s = (Math.imul(1664525, s) + 1013904223) >>> 0) / 4294967296;

const idRNG = createRNG(seed);
const timeRNG = createRNG(seed ^ 0x601D);
const genTID = (p) => p + Math.floor(idRNG() * 1000000000);

const now = new Date();
const getPastDate = (d, h=0) => new Date(now.getTime() - (d*86400000 + h*3600000)).toISOString();

const eventDatabase = [
    { type: "PURCHASE", date: getPastDate(730), tid: genTID("4000"), plan: "yearly" },
    { type: "RENEW", date: getPastDate(365), tid: genTID("5000"), plan: "yearly" },
    { type: "BILLING_ERROR", date: getPastDate(15, 2), reason: "insufficient_funds" },
    { type: "RETRY", date: getPastDate(14, 1), attempt: 1 },
    { type: "RETRY", date: getPastDate(12, 4), attempt: 2 },
    { type: "RECOVERED", date: getPastDate(10, 5), tid: genTID("6000"), plan: "yearly" }
];

let state = {
    status: "EXPIRED",
    isActive: false,
    expiryDate: null,
    lastPurchase: null,
    currentTID: null,
    wasInRetry: false
};

eventDatabase.forEach(ev => {
    const evDate = new Date(ev.date);
    
    switch (ev.type) {
        case "PURCHASE":
        case "RENEW":
        case "RECOVERED":
            state.status = "ACTIVE";
            state.isActive = true;
            state.lastPurchase = ev.date;
            state.currentTID = ev.tid || state.currentTID;
            let exp = new Date(evDate);
            exp.setFullYear(exp.getFullYear() + (ev.plan === "yearly" ? 1 : 0));
            if (ev.plan === "monthly") exp.setMonth(exp.getMonth() + 1);
            state.expiryDate = exp.toISOString();
            break;

        case "BILLING_ERROR":
        case "RETRY":
            state.wasInRetry = true;
            const isWithinGrace = state.expiryDate && (evDate < new Date(state.expiryDate));
            state.status = isWithinGrace ? "BILLING_RETRY" : "EXPIRED";
            state.isActive = isWithinGrace;
            break;
    }
});

const sTime = new Date(now.getTime() - (Math.floor(timeRNG() * 2000) + 1000)).toISOString();
const safeExpiry = state.expiryDate || getPastDate(-365);

const revenueCatSchema = {
    "product_identifier": "com.locket.gold.yearly",
    "original_purchase_date": eventDatabase[0].date,
    "purchase_date": state.lastPurchase || eventDatabase[0].date,
    "expires_date": safeExpiry,
    "original_transaction_id": eventDatabase[0].tid,
    "transaction_id": state.currentTID || eventDatabase[0].tid,
    "store": "app_store",
    "ownership_type": "PURCHASED",
    "period_type": "active"
};

try {
    if (url.includes("api.revenuecat.com")) {
        obj.subscriber = obj.subscriber || {};
        obj.subscriber.entitlements = { "gold": revenueCatSchema };
        obj.subscriber.subscriptions = { "com.locket.gold.yearly": revenueCatSchema };
        obj.subscriber.request_date = sTime;
        obj.subscriber.last_seen = sTime;
    }

    if (url.includes("/v1/users/self")) {
        if (obj.data) {
            obj.data.is_gold = state.isActive;
            obj.data.premium_status = state.status.toLowerCase();
            obj.data.subscriptions = [{
                "product_id": "com.locket.gold.yearly",
                "original_transaction_id": eventDatabase[0].tid,
                "transaction_id": state.currentTID,
                "purchase_date_ms": new Date(state.lastPurchase).getTime(),
                "expires_date_ms": new Date(safeExpiry).getTime(),
                "status": state.status === "ACTIVE" ? "active" : "billing_retry",
                "is_active": state.isActive,
                "was_in_billing_retry_period": state.wasInRetry
            }];
            obj.data.last_active_at = sTime;
        }
    }
    $done({ body: JSON.stringify(obj) });
} catch (e) { 
    $done({}); 
  }
