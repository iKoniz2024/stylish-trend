const express = require("express");
const {
    createCollection,
    getAllCollections,
    getSingleCollection,
    updateCollection,
    deleteCollection
} = require("../controllers/collections.controller");

const validate = require("../middlewares/validate");
const verifyToken = require("../middlewares/verifyToken");
const verifyAdmin = require("../middlewares/verifyAdmin");

const {
    createCollectionSchema,
    updateCollectionSchema
} = require("../validations/collection.validation");

const router = express.Router();

router.get("/", getAllCollections);
router.get("/:id", getSingleCollection);

router.post(
    "/",
    verifyToken,
    verifyAdmin,
    validate(createCollectionSchema),
    createCollection
);

router.patch(
    "/:id",
    verifyToken,
    verifyAdmin,
    validate(updateCollectionSchema),
    updateCollection
);

router.delete(
    "/:id",
    verifyToken,
    verifyAdmin,
    deleteCollection
);

module.exports = router;
