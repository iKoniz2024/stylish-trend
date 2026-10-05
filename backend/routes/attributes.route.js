const express = require("express");
const {
    createAttribute,
    getAllAttributes,
    getSingleAttribute,
    updateAttribute,
    deleteAttribute
} = require("../controllers/attributes.controller");

const validate = require("../middlewares/validate");
const verifyToken = require("../middlewares/verifyToken");
const verifyAdmin = require("../middlewares/verifyAdmin");

const {
    createAttributeSchema,
    updateAttributeSchema
} = require("../validations/attribute.validation");

const router = express.Router();

router.get("/", getAllAttributes);
router.get("/:id", getSingleAttribute);

router.post(
    "/",
    verifyToken,
    verifyAdmin,
    validate(createAttributeSchema),
    createAttribute
);

router.patch(
    "/:id",
    verifyToken,
    verifyAdmin,
    validate(updateAttributeSchema),
    updateAttribute
);

router.delete(
    "/:id",
    verifyToken,
    verifyAdmin,
    deleteAttribute
);

module.exports = router;
