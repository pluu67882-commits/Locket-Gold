
const url = $request.url;
let obj = JSON.parse($response.body || "{}");

// --- DỮ LIỆU CỐ ĐỊNH (FIX ĐIỂM YẾU 1 & 4) ---
// Thay vì dùng Date.now(), ta dùng một mốc thời gian cũ cố định để tạo "Lịch sử"
const STABLE_PURCHASE_DATE = "2026-01-15T08:30:00Z"; 
const STABLE_TID = "300000987654321"; // ID cố định để tránh nhảy ID bất thường
const appId = "com.locket.gold.yearly";

try {
    if (url.includes("api.revenuecat.com")) {
        const subData = {
            "expires_date": "2035-12-31T23:59:59Z",
            "purchase_date": STABLE_PURCHASE_DATE,
            "original_purchase_date": STABLE_PURCHASE_DATE,
            "ownership_type": "PURCHASED",
            "store": "app_store",
            "is_sandbox": false,
            "product_identifier": appId,
            "original_transaction_id": STABLE_TID,
            "transaction_id": STABLE_TID
        };

        obj.subscriber = obj.subscriber || {};
        obj.subscriber.entitlements = { "gold": subData };
        obj.subscriber.subscriptions = { [appId]: subData };
        
        // KHÔNG xóa last_seen (Fix điểm yếu 3)
        // Để server ghi nhận bạn vẫn đang "sinh hoạt" bình thường
    }

    if (url.includes("/v1/users/self")) {
        if (obj.data) {
            obj.data.is_gold = true;
            obj.data.premium_status = "active";
            obj.data.subscriptions = [{
                "product_id": appId,
                "expires_date_ms": 2082758400000,
                "status": "active"
            }];
            // Trả về trạng thái "valid" nhưng giữ lại các log cũ (nếu có)
            obj.data.receipt_validation_status = "valid";
        }
    }

    $done({ body: JSON.stringify(obj) });
} catch (e) {
    $done({});
}
