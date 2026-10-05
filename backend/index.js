const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const path = require("path");
const compression = require("compression");

dotenv.config();

const { connectDB } = require("./config/db");

const productRoutes = require("./routes/products.route");
const categoryRoutes = require("./routes/categories.route");
const authRoutes = require("./routes/auth.route");
const userRoutes = require("./routes/users.route");
const cartRoutes = require("./routes/cart.route");
const orderRoutes = require("./routes/orders.route");
const settingsRoutes = require("./routes/settings.route");
const bannerRoutes = require("./routes/banner.route");
const vendorRoutes = require("./routes/vendor.route");
const attributeRoutes = require("./routes/attributes.route");
const collectionRoutes = require("./routes/collections.route");
const { rateLimiter } = require("./middlewares/rateLimiter");

const app = express();
const port = process.env.PORT || 5000;

// Enable HTTP Gzip / Brotli compression for fast payload transfers
app.use(compression());

const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, "") : "";
const allowedOrigins = [
    clientUrl,
    "https://stylishtrend.store",
    "https://www.stylishtrend.store",
    "https://stylishtrend.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
].filter(Boolean);

app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);
            const cleanOrigin = origin.replace(/\/$/, "");
            if (allowedOrigins.some(o => o && cleanOrigin.startsWith(o)) || process.env.NODE_ENV !== "production") {
                return callback(null, true);
            }
            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
    })
);

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Cache headers middleware for public GET APIs to optimize CDN edge caching
app.use((req, res, next) => {
    if (req.method === "GET") {
        const isPublicApi = req.path.startsWith("/api/products") ||
            req.path.startsWith("/api/categories") ||
            req.path.startsWith("/api/banners") ||
            req.path.startsWith("/api/settings") ||
            req.path.startsWith("/api/collections");
        if (isPublicApi) {
            res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
        }
    }
    next();
});

app.use("/uploads", express.static(path.join(__dirname, "uploads"), { maxAge: "7d" }));

if (process.env.VERCEL) {
    app.use(async (req, res, next) => {
        try {
            await connectDB();
            next();
        } catch (error) {
            res.status(500).json({ message: "Database connection failed" });
        }
    });
}

const authLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 50, message: { message: "Too many login/register attempts. Please try again later." } });
const orderLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 30, message: { message: "Too many order submissions. Please try again later." } });

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/attributes", attributeRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderLimiter, orderRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/vendors", vendorRoutes);

app.get("/", (req, res) => {
    res.send("StylishTrend Server is Running...");
});

if (process.env.VERCEL) {
    module.exports = app;
} else {
    startServer();
}

async function startServer() {
    try {
        await connectDB();
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    } catch (error) {
        console.log(error);
    }
}
