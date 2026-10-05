const rateLimitMap = new Map();

const rateLimiter = (options = {}) => {
    const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
    const max = options.max || 100; // max requests per window
    const message = options.message || { message: "Too many requests from this IP, please try again later." };

    return (req, res, next) => {
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown-ip";
        const now = Date.now();

        if (!rateLimitMap.has(ip)) {
            rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
            return next();
        }

        const record = rateLimitMap.get(ip);
        if (now > record.resetTime) {
            record.count = 1;
            record.resetTime = now + windowMs;
            return next();
        }

        record.count += 1;
        if (record.count > max) {
            return res.status(429).json(message);
        }

        next();
    };
};

// Periodic cleanup of expired rate limit entries
if (typeof setInterval !== "undefined") {
    const timer = setInterval(() => {
        const now = Date.now();
        for (const [ip, record] of rateLimitMap.entries()) {
            if (now > record.resetTime) {
                rateLimitMap.delete(ip);
            }
        }
    }, 10 * 60 * 1000);
    if (timer.unref) timer.unref();
}

module.exports = { rateLimiter };
