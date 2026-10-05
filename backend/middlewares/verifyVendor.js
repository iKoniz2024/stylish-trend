const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");

const verifyVendor = async (req, res, next) => {
    try {
        const db = getDB();
        const usersCollection = db.collection("users");

        const user = await usersCollection.findOne({
            _id: new ObjectId(req.user.id)
        });

        if (!user) {
            return res.status(404).send({
                message: "User not found"
            });
        }

        // Admin bypass
        if (user.role === "admin") {
            req.vendorUser = user;
            return next();
        }

        if (user.role !== "vendor") {
            return res.status(403).send({
                message: "Access denied. Vendor account required."
            });
        }

        const vendorStatus = user.vendorInfo?.status;

        if (vendorStatus === "suspended") {
            return res.status(403).send({
                message: "Vendor account is suspended. Please contact platform administrator."
            });
        }

        if (vendorStatus === "rejected") {
            return res.status(403).send({
                message: "Vendor account application was rejected."
            });
        }

        if (vendorStatus !== "approved") {
            return res.status(403).send({
                message: "Vendor account is pending approval by administrator."
            });
        }

        req.vendorUser = user;
        next();

    } catch (error) {
        console.error("verifyVendor error:", error);
        res.status(500).send({
            message: "Internal Server Error"
        });
    }
};

module.exports = verifyVendor;
module.exports.verifySellerOrAdmin = verifyVendor;
