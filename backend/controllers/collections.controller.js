const { getDB } = require("../config/db");
const { buildIdQuery } = require("../utils/buildIdQuery");
const { withCache, clearCache } = require("../utils/cache");

const createCollection = async (req, res) => {
    try {
        const db = getDB();
        const collectionsCollection = db.collection("collections");

        const slug = req.body.slug.trim().toLowerCase();
        const existing = await collectionsCollection.findOne({ slug });
        if (existing) {
            return res.status(400).send({ message: `Collection with slug '${slug}' already exists` });
        }

        const newCollection = {
            name: req.body.name.trim(),
            slug,
            description: req.body.description || "",
            image: req.body.image || "",
            banner: req.body.banner || "",
            status: req.body.status || "active",
            isFeatured: Boolean(req.body.isFeatured),
            sortOrder: Number(req.body.sortOrder ?? 0),
            startDate: req.body.startDate ? new Date(req.body.startDate) : null,
            endDate: req.body.endDate ? new Date(req.body.endDate) : null,
            metaTitle: req.body.metaTitle || "",
            metaDescription: req.body.metaDescription || "",
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await collectionsCollection.insertOne(newCollection);
        clearCache();

        res.status(201).send({
            message: "Collection created successfully",
            insertedId: result.insertedId,
            collection: { ...newCollection, _id: result.insertedId }
        });

    } catch (error) {
        console.error("createCollection error:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

const getAllCollections = async (req, res) => {
    try {
        const db = getDB();
        const collectionsCollection = db.collection("collections");
        const productsCollection = db.collection("products");

        const status = req.query.status || "";
        const query = {};
        if (status) {
            query.status = status;
        }

        const collections = await withCache(`all_collections_${status}`, 15, async () => {
            const list = await collectionsCollection.find(query).sort({ sortOrder: 1, createdAt: -1 }).toArray();

            // Calculate product counts for each collection
            const counts = await productsCollection.aggregate([
                { $unwind: "$collectionIds" },
                { $group: { _id: "$collectionIds", count: { $sum: 1 } } }
            ]).toArray();

            const countMap = new Map(counts.map(c => [String(c._id), c.count]));

            return list.map(col => ({
                ...col,
                productCount: (countMap.get(String(col._id)) || 0) + (countMap.get(col.slug) || 0)
            }));
        });

        res.send(collections);
    } catch (error) {
        console.error("getAllCollections error:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

const getSingleCollection = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();
        const collectionsCollection = db.collection("collections");

        const collection = await collectionsCollection.findOne(buildIdQuery(id));
        if (!collection) {
            return res.status(404).send({ message: "Collection not found" });
        }

        res.send(collection);
    } catch (error) {
        console.error("getSingleCollection error:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

const updateCollection = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();
        const collectionsCollection = db.collection("collections");

        const existing = await collectionsCollection.findOne(buildIdQuery(id));
        if (!existing) {
            return res.status(404).send({ message: "Collection not found" });
        }

        if (req.body.slug && req.body.slug.trim().toLowerCase() !== existing.slug) {
            const slug = req.body.slug.trim().toLowerCase();
            const existingSlug = await collectionsCollection.findOne({ slug, _id: { $ne: existing._id } });
            if (existingSlug) {
                return res.status(400).send({ message: `Collection with slug '${slug}' already exists` });
            }
        }

        const updateData = {
            ...req.body,
            updatedAt: new Date()
        };
        if (updateData.slug) {
            updateData.slug = updateData.slug.trim().toLowerCase();
        }
        if (updateData.startDate) {
            updateData.startDate = new Date(updateData.startDate);
        }
        if (updateData.endDate) {
            updateData.endDate = new Date(updateData.endDate);
        }

        await collectionsCollection.updateOne(buildIdQuery(id), { $set: updateData });

        clearCache();
        res.send({ message: "Collection updated successfully" });

    } catch (error) {
        console.error("updateCollection error:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

const deleteCollection = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();
        const collectionsCollection = db.collection("collections");

        const result = await collectionsCollection.deleteOne(buildIdQuery(id));
        if (result.deletedCount === 0) {
            return res.status(404).send({ message: "Collection not found" });
        }

        clearCache();
        res.send({ message: "Collection deleted successfully" });
    } catch (error) {
        console.error("deleteCollection error:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

module.exports = {
    createCollection,
    getAllCollections,
    getSingleCollection,
    updateCollection,
    deleteCollection
};
