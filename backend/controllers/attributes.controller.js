const { getDB } = require("../config/db");
const { buildIdQuery } = require("../utils/buildIdQuery");
const { withCache, clearCache } = require("../utils/cache");

const createAttribute = async (req, res) => {
    try {
        const db = getDB();
        const attributesCollection = db.collection("attributes");

        const code = req.body.code.trim().toLowerCase();

        const existing = await attributesCollection.findOne({ code });
        if (existing) {
            return res.status(400).send({ message: `Attribute with code '${code}' already exists` });
        }

        const attribute = {
            name: req.body.name.trim(),
            code,
            type: req.body.type || "text",
            options: Array.isArray(req.body.options) ? req.body.options : [],
            unit: req.body.unit || "",
            isRequired: Boolean(req.body.isRequired),
            isFilterable: req.body.isFilterable !== undefined ? Boolean(req.body.isFilterable) : true,
            isSearchable: Boolean(req.body.isSearchable),
            useAsVariant: Boolean(req.body.useAsVariant),
            sortOrder: Number(req.body.sortOrder ?? 0),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await attributesCollection.insertOne(attribute);
        clearCache();

        res.status(201).send({
            message: "Attribute created successfully",
            insertedId: result.insertedId,
            attribute: { ...attribute, _id: result.insertedId }
        });

    } catch (error) {
        console.error("createAttribute error:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

const getAllAttributes = async (req, res) => {
    try {
        const db = getDB();
        const attributesCollection = db.collection("attributes");

        const attributes = await withCache("all_attributes", 15, async () => {
            return await attributesCollection.find().sort({ sortOrder: 1, name: 1 }).toArray();
        });

        res.send(attributes);
    } catch (error) {
        console.error("getAllAttributes error:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

const getSingleAttribute = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();
        const attributesCollection = db.collection("attributes");

        const attribute = await attributesCollection.findOne(buildIdQuery(id));
        if (!attribute) {
            return res.status(404).send({ message: "Attribute not found" });
        }

        res.send(attribute);
    } catch (error) {
        console.error("getSingleAttribute error:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

const updateAttribute = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();
        const attributesCollection = db.collection("attributes");

        const existing = await attributesCollection.findOne(buildIdQuery(id));
        if (!existing) {
            return res.status(404).send({ message: "Attribute not found" });
        }

        if (req.body.code && req.body.code.trim().toLowerCase() !== existing.code) {
            const code = req.body.code.trim().toLowerCase();
            const existingCode = await attributesCollection.findOne({ code, _id: { $ne: existing._id } });
            if (existingCode) {
                return res.status(400).send({ message: `Attribute with code '${code}' already exists` });
            }
        }

        const updateData = {
            ...req.body,
            updatedAt: new Date()
        };
        if (updateData.code) {
            updateData.code = updateData.code.trim().toLowerCase();
        }

        await attributesCollection.updateOne(buildIdQuery(id), { $set: updateData });

        clearCache();
        res.send({ message: "Attribute updated successfully" });

    } catch (error) {
        console.error("updateAttribute error:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

const deleteAttribute = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();
        const attributesCollection = db.collection("attributes");

        const result = await attributesCollection.deleteOne(buildIdQuery(id));
        if (result.deletedCount === 0) {
            return res.status(404).send({ message: "Attribute not found" });
        }

        clearCache();
        res.send({ message: "Attribute deleted successfully" });
    } catch (error) {
        console.error("deleteAttribute error:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

module.exports = {
    createAttribute,
    getAllAttributes,
    getSingleAttribute,
    updateAttribute,
    deleteAttribute
};
