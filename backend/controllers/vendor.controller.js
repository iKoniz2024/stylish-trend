const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

// Admin: Get all vendors/vendor applications
const getAllVendors = async (req, res) => {
    try {
        const db = getDB();
        const usersCollection = db.collection("users");

        const vendors = await usersCollection.find(
            { role: "vendor" },
            { projection: { password: 0 } }
        ).sort({ createdAt: -1 }).toArray();

        res.status(200).json({
            success: true,
            vendors
        });
    } catch (error) {
        console.error("getAllVendors error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Admin: Approve, Reject, or Suspend a vendor application
const updateVendorStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'approved' | 'rejected' | 'pending' | 'suspended'

        const allowedStatuses = ["approved", "rejected", "pending", "suspended"];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status value. Allowed: ${allowedStatuses.join(", ")}.`
            });
        }

        const db = getDB();
        const usersCollection = db.collection("users");

        const result = await usersCollection.updateOne(
            { _id: new ObjectId(id), role: "vendor" },
            { $set: { "vendorInfo.status": status, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "Vendor not found." });
        }

        res.status(200).json({
            success: true,
            message: `Vendor status updated to '${status}' successfully.`
        });
    } catch (error) {
        console.error("updateVendorStatus error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Vendor: Get dashboard stats & earnings
const getVendorDashboardStats = async (req, res) => {
    try {
        const db = getDB();
        const vendorId = req.vendorUser._id.toString();

        const productsCollection = db.collection("products");
        const ordersCollection = db.collection("orders");

        const totalProducts = await productsCollection.countDocuments({ vendorId });

        // Fetch orders containing items for this vendor
        const orders = await ordersCollection.find({ "items.vendorId": vendorId }).toArray();

        let totalSales = 0;
        let totalItemsSold = 0;

        orders.forEach(order => {
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    if (item.vendorId === vendorId) {
                        const itemQty = Number(item.quantity || 1);
                        const itemPrice = Number(item.price || 0);
                        const itemSubtotal = item.subtotal ? Number(item.subtotal) : (itemPrice * itemQty);
                        
                        totalItemsSold += itemQty;
                        totalSales += itemSubtotal;
                    }
                });
            }
        });

        res.status(200).json({
            success: true,
            stats: {
                totalProducts,
                totalOrdersCount: orders.length,
                totalItemsSold,
                totalSales
            }
        });
    } catch (error) {
        console.error("getVendorDashboardStats error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Vendor: Get orders assigned to vendor
const getVendorOrders = async (req, res) => {
    try {
        const db = getDB();
        const vendorId = req.vendorUser._id.toString();

        const ordersCollection = db.collection("orders");
        const orders = await ordersCollection.find({ "items.vendorId": vendorId }).sort({ createdAt: -1 }).toArray();

        // Filter items inside orders to strictly show items belonging to this vendor
        const vendorOrders = orders.map(order => {
            const vendorItems = (order.items || [])
                .filter(item => item.vendorId === vendorId)
                .map(item => ({
                    productId: item.productId,
                    title: item.title,
                    thumbnail: item.thumbnail,
                    price: Number(item.price || 0),
                    quantity: Number(item.quantity || 1),
                    total: Number(item.subtotal || (Number(item.price || 0) * Number(item.quantity || 1))),
                    size: item.size || "",
                    color: item.color || "",
                    vendorId: item.vendorId
                }));

            const vendorSubtotal = vendorItems.reduce((sum, item) => sum + item.total, 0);

            return {
                _id: order._id,
                guestPhone: order.guestPhone || order.shippingAddress?.phone,
                shippingAddress: order.shippingAddress,
                orderStatus: order.orderStatus,
                paymentStatus: order.paymentStatus,
                createdAt: order.createdAt,
                items: vendorItems,
                vendorSubtotal
            };
        });

        res.status(200).json({
            success: true,
            orders: vendorOrders
        });
    } catch (error) {
        console.error("getVendorOrders error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Public: Get a featured (approved) vendor based on order count
const getFeaturedVendor = async (req, res) => {
    try {
        const db = getDB();
        const usersCollection = db.collection("users");
        const ordersCollection = db.collection("orders");

        // Find vendor with most items sold
        const topVendors = await ordersCollection.aggregate([
            { $unwind: "$items" },
            { $match: { "items.vendorId": { $exists: true, $ne: null } } },
            { $group: { _id: "$items.vendorId", salesCount: { $sum: 1 } } },
            { $sort: { salesCount: -1 } }
        ]).toArray();

        let featuredVendor = null;

        // Try to find the top approved vendor
        for (const data of topVendors) {
            try {
                const vendor = await usersCollection.findOne({
                    _id: new ObjectId(data._id),
                    role: "vendor",
                    "vendorInfo.status": "approved"
                }, { projection: { password: 0 } });

                if (vendor) {
                    featuredVendor = vendor;
                    break;
                }
            } catch (err) {
                // Invalid ObjectId or other issue, just continue to next
                continue;
            }
        }

        // Fallback: If no top vendor found (e.g. no orders yet), just pick any approved vendor
        if (!featuredVendor) {
            featuredVendor = await usersCollection.findOne(
                { role: "vendor", "vendorInfo.status": "approved" },
                { projection: { password: 0 } }
            );
        }

        if (!featuredVendor) {
            return res.status(404).json({ success: false, message: "No featured vendor found." });
        }

        res.status(200).json({
            success: true,
            vendor: featuredVendor
        });
    } catch (error) {
        console.error("getFeaturedVendor error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = {
    getAllVendors,
    updateVendorStatus,
    getVendorDashboardStats,
    getVendorOrders,
    getFeaturedVendor
};
