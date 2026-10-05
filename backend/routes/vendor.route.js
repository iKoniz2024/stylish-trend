const express = require("express");
const verifyToken = require("../middlewares/verifyToken");
const verifyAdmin = require("../middlewares/verifyAdmin");
const verifyVendor = require("../middlewares/verifyVendor");

const {
    getAllVendors,
    updateVendorStatus,
    getVendorDashboardStats,
    getVendorOrders,
    getFeaturedVendor
} = require("../controllers/vendor.controller");

const router = express.Router();

// Public Routes
router.get("/public/featured", getFeaturedVendor);

// Admin Routes
router.get("/admin/all", verifyToken, verifyAdmin, getAllVendors);
router.patch("/admin/:id/status", verifyToken, verifyAdmin, updateVendorStatus);

// Vendor Routes
router.get("/dashboard/stats", verifyToken, verifyVendor, getVendorDashboardStats);
router.get("/orders", verifyToken, verifyVendor, getVendorOrders);

module.exports = router;
