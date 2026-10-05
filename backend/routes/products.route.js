const express = require("express");

const {
    createProduct,
    getAllProducts,
    getSingleProduct,
    updateProduct,
    deleteProduct,
    getFlashSaleProducts,
    getBestSellingProducts,
    getNewArrivals,
    getLatestReviews,
    getFeaturedProducts
} = require("../controllers/products.controller");

const validate = require("../middlewares/validate");
const verifyToken = require("../middlewares/verifyToken");
const { verifyOptionalToken } = require("../middlewares/verifyToken");
const { verifySellerOrAdmin } = require("../middlewares/verifyVendor");

const {
    createProductSchema,
    updateProductSchema
} = require("../validations/product.validation");

const router = express.Router();

router.get("/flash-sale", getFlashSaleProducts);

router.get("/best-sellers", getBestSellingProducts);

router.get("/new-arrivals", getNewArrivals);

router.get("/featured", getFeaturedProducts);

router.get("/reviews", getLatestReviews);

// Product creation (Allowed for Seller or Admin)
router.post(
    "/",
    verifyToken,
    verifySellerOrAdmin,
    validate(createProductSchema),
    createProduct
);

// Public product listing
router.get("/", verifyOptionalToken, getAllProducts);

router.get("/:id", getSingleProduct);

// Product update (Allowed for Seller or Admin)
router.patch(
    "/:id",
    verifyToken,
    verifySellerOrAdmin,
    validate(updateProductSchema),
    updateProduct
);

// Product deletion (Allowed for Seller or Admin)
router.delete(
    "/:id",
    verifyToken,
    verifySellerOrAdmin,
    deleteProduct
);

module.exports = router;