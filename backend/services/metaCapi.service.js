const crypto = require("crypto");
const { getDB } = require("../config/db");

/**
 * SHA-256 hash helper required by Meta Conversions API
 */
const hashData = (data) => {
  if (!data || typeof data !== "string") return undefined;
  const cleaned = data.trim().toLowerCase();
  if (!cleaned) return undefined;
  return crypto.createHash("sha256").update(cleaned).digest("hex");
};

/**
 * Clean and normalize phone numbers for Meta CAPI
 */
const hashPhone = (phone) => {
  if (!phone || typeof phone !== "string") return undefined;
  const cleaned = phone.replace(/\D/g, ""); // strip non-digits
  if (!cleaned) return undefined;
  return crypto.createHash("sha256").update(cleaned).digest("hex");
};

/**
 * Send server-side Purchase event to Meta Graph API
 * @param {Object} order - The created order object
 * @param {Object} req - The Express request object (for IP and User-Agent)
 */
const sendPurchaseEvent = async (order, req) => {
  try {
    const db = getDB();
    if (!db) return;

    const settingsCollection = db.collection("settings");
    const settings = await settingsCollection.findOne({});

    // Collect all valid Pixel + AccessToken pairs
    const pixelConfigs = [];

    if (settings && Array.isArray(settings.metaPixels) && settings.metaPixels.length > 0) {
      settings.metaPixels.forEach((item) => {
        const pixelName = (item.name || "").trim();
        const pid = (item.pixelId || "").trim();
        const token = (item.accessToken || "").trim();
        const testCode = (item.testEventCode || "").trim();
        if (pid && token && !token.toLowerCase().includes("demo") && !token.includes("123456")) {
          pixelConfigs.push({ name: pixelName || "Meta Pixel", pixelId: pid, accessToken: token, testEventCode: testCode });
        }
      });
    }

    // Fallback to top-level metaPixelId and metaAccessToken if present
    if (pixelConfigs.length === 0 && settings && settings.metaPixelId && settings.metaAccessToken) {
      const topPids = settings.metaPixelId.split(",").map((id) => id.trim()).filter(Boolean);
      const topToken = settings.metaAccessToken.trim();
      const topTestCode = (settings.metaTestEventCode || "").trim();
      const topName = (settings.metaPixelName || "Primary Meta Pixel").trim();
      if (topToken && !topToken.toLowerCase().includes("demo") && !topToken.includes("123456")) {
        topPids.forEach((pid) => {
          pixelConfigs.push({ name: topName, pixelId: pid, accessToken: topToken, testEventCode: topTestCode });
        });
      }
    }

    // Direct fallback to environment variables if database configuration is not yet saved
    if (pixelConfigs.length === 0 && process.env.META_PIXEL_ID && process.env.META_ACCESS_TOKEN) {
      const envToken = process.env.META_ACCESS_TOKEN.trim();
      if (envToken && !envToken.toLowerCase().includes("demo") && !envToken.includes("123456")) {
        pixelConfigs.push({
          name: "Env Meta Pixel",
          pixelId: process.env.META_PIXEL_ID.trim(),
          accessToken: envToken,
          testEventCode: (process.env.META_TEST_EVENT_CODE || "").trim(),
        });
      }
    }

    if (pixelConfigs.length === 0) {
      return; // No Meta Conversions API credentials configured
    }

    // Extract customer details
    const email = order.shippingAddress?.email || order.guestEmail || req.user?.email || "";
    const phone = order.shippingAddress?.phone || order.guestPhone || req.user?.phone || "";
    const name = order.shippingAddress?.name || order.guestName || req.user?.name || "";
    const firstName = name.split(" ")[0] || "";
    const lastName = name.split(" ").slice(1).join(" ") || "";

    const userIp = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || "";
    const userAgent = req.headers["user-agent"] || "";

    const hashedEmail = hashData(email);
    const hashedPhone = hashPhone(phone);
    const hashedFn = hashData(firstName);
    const hashedLn = hashData(lastName);

    // Format custom items for Meta payload
    const contents = (order.items || []).map((item) => ({
      id: String(item.productId || ""),
      quantity: Number(item.quantity || 1),
      item_price: Number(item.price || 0),
    }));

    const eventTime = Math.floor(Date.now() / 1000);
    const eventId = `order_${order._id || Date.now()}`;

    // Send payload for each configured Pixel
    for (const config of pixelConfigs) {
      const payload = {
        data: [
          {
            event_name: "Purchase",
            event_time: eventTime,
            event_id: eventId,
            action_source: "website",
            event_source_url: req.headers?.referer || req.headers?.origin || "https://zayanclassic.com",
            user_data: {
              ...(hashedEmail ? { em: [hashedEmail] } : {}),
              ...(hashedPhone ? { ph: [hashedPhone] } : {}),
              ...(hashedFn ? { fn: [hashedFn] } : {}),
              ...(hashedLn ? { ln: [hashedLn] } : {}),
              ...(userIp ? { client_ip_address: userIp } : {}),
              ...(userAgent ? { client_user_agent: userAgent } : {}),
            },
            custom_data: {
              currency: "BDT",
              value: Number(order.totalPrice || order.subtotal || 0),
              content_type: "product",
              contents: contents,
              num_items: contents.reduce((acc, curr) => acc + curr.quantity, 0),
            },
          },
        ],
        ...(config.testEventCode ? { test_event_code: config.testEventCode } : {}),
      };

      const metaUrl = `https://graph.facebook.com/v19.0/${config.pixelId}/events?access_token=${encodeURIComponent(config.accessToken)}`;

      // Fire request asynchronously with internal catch block
      fetch(metaUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          const resData = await res.json().catch(() => ({}));
          if (res.ok) {
            console.log(`[Meta CAPI Success] Purchase event sent to Pixel '${config.name}' (${config.pixelId}). Events received:`, resData.events_received);
          } else {
            console.warn(`[Meta CAPI Warning] Pixel '${config.name}' (${config.pixelId}) response error:`, resData.error?.message || resData);
          }
        })
        .catch((err) => {
          console.error(`[Meta CAPI Network Error] Pixel '${config.name}' (${config.pixelId}):`, err.message);
        });
    }
  } catch (error) {
    // Fail silently to safeguard order processing flow
    console.error("[Meta CAPI Service Exception]:", error.message);
  }
};

module.exports = {
  sendPurchaseEvent,
};
