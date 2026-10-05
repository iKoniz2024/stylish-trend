const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");
const { withCache, clearCache } = require("../utils/cache");
const { buildIdQuery } = require("../utils/buildIdQuery");

const checkCircularDependency = async (categoriesCollection, categoryId, targetParentId) => {
    if (!targetParentId) return false;
    let currentId = targetParentId;
    while (currentId) {
        if (String(currentId) === String(categoryId)) {
            return true;
        }
        const parentCat = await categoriesCollection.findOne(buildIdQuery(currentId));
        if (!parentCat || !parentCat.parentId) {
            break;
        }
        currentId = parentCat.parentId;
    }
    return false;
};

const buildTree = (categories, parentId = null) => {
    return categories
        .filter(cat => {
            const pId = typeof cat.parentId === "object" ? cat.parentId?._id : cat.parentId;
            if (!parentId) {
                return !pId;
            }
            return String(pId) === String(parentId) || pId === parentId;
        })
        .map(cat => {
            const childItems = buildTree(categories, cat._id);
            const embeddedChildren = Array.isArray(cat.children) ? cat.children : [];
            const combinedChildren = [...childItems];
            embeddedChildren.forEach(emb => {
                if (!combinedChildren.some(c => c.slug === emb.slug || String(c._id) === String(emb._id))) {
                    combinedChildren.push(emb);
                }
            });
            return {
                ...cat,
                children: combinedChildren
            };
        });
};

const createCategory = async (req, res) => {
    try {
        const db = getDB();
        const categoriesCollection = db.collection("categories");

        const slug = req.body.slug.trim();

        // Unique slug validation
        const existingSlug = await categoriesCollection.findOne({ slug });
        if (existingSlug) {
            return res.status(400).send({ message: `Category with slug '${slug}' already exists` });
        }

        // Parent existence check
        let parentId = req.body.parentId || null;
        if (parentId) {
            const parentCat = await categoriesCollection.findOne(buildIdQuery(parentId));
            if (!parentCat) {
                return res.status(400).send({ message: "Invalid parent category ID" });
            }
        }

        const category = {
            name: req.body.name.trim(),
            slug,
            parentId: parentId ? String(parentId) : null,
            description: req.body.description || "",
            image: req.body.image || "",
            banner: req.body.banner || "",
            icon: req.body.icon || "",
            status: req.body.status || "active",
            sortOrder: Number(req.body.sortOrder ?? 0),
            isFeatured: Boolean(req.body.isFeatured),
            isVisibleInMenu: req.body.isVisibleInMenu !== undefined ? Boolean(req.body.isVisibleInMenu) : true,
            isVisibleInHome: req.body.isVisibleInHome !== undefined ? Boolean(req.body.isVisibleInHome) : true,
            attributeIds: Array.isArray(req.body.attributeIds) ? req.body.attributeIds : [],
            attributes: Array.isArray(req.body.attributes) ? req.body.attributes : [],
            children: Array.isArray(req.body.children) ? req.body.children : [],
            metaTitle: req.body.metaTitle || "",
            metaDescription: req.body.metaDescription || "",
            keywords: Array.isArray(req.body.keywords) ? req.body.keywords : [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await categoriesCollection.insertOne(category);
        clearCache();

        res.status(201).send({
            message: "Category created successfully",
            insertedId: result.insertedId,
            category: { ...category, _id: result.insertedId }
        });

    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

const getCategoriesWithCounts = async (req, res) => {
    try {
        const categoriesWithCounts = await withCache("categoriesWithCounts", 120, async () => {
            const db = getDB();
            const categoriesCollection = db.collection("categories");
            const productsCollection = db.collection("products");

            const categories = await categoriesCollection.find().sort({ sortOrder: 1, name: 1 }).toArray();

            const countResult = await productsCollection.aggregate([
                {
                    $project: {
                        allCats: {
                            $concatArrays: [
                                { $cond: [{ $isArray: "$categories" }, "$categories", []] },
                                { $cond: [{ $ne: ["$primaryCategory", null] }, ["$primaryCategory"], []] },
                                { $cond: [{ $ne: ["$category", null] }, ["$category"], []] }
                            ]
                        }
                    }
                },
                { $unwind: "$allCats" },
                { $group: { _id: "$allCats", count: { $sum: 1 } } }
            ]).toArray();

            const countMap = new Map(countResult.map(r => [String(r._id), r.count]));

            const withCounts = categories.map(cat => {
                const count = (countMap.get(String(cat._id)) || 0) + (countMap.get(cat.slug) || 0);
                return { ...cat, productCount: count };
            });

            return buildTree(withCounts);
        });

        res.send(categoriesWithCounts);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

const getAllCategories = async (req, res) => {
    try {
        const db = getDB();
        const categoriesCollection = db.collection("categories");

        const page = req.query.page ? parseInt(req.query.page) : null;
        const limit = req.query.limit ? parseInt(req.query.limit) : null;
        const search = req.query.search || "";
        const status = req.query.status || "";
        const asTree = req.query.asTree === "true";

        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { slug: { $regex: search, $options: "i" } }
            ];
        }
        if (status) {
            query.status = status;
        }

        const cacheKey = `categories_${page}_${limit}_${search}_${status}_${asTree}`;
        const result = await withCache(cacheKey, 15, async () => {
            if (page && limit) {
                const skip = (page - 1) * limit;
                const totalCategories = await categoriesCollection.countDocuments(query);

                const categories = await categoriesCollection
                    .find(query)
                    .sort({ sortOrder: 1, createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                return {
                    totalCategories,
                    currentPage: page,
                    totalPages: Math.ceil(totalCategories / limit),
                    categories: asTree ? buildTree(categories) : categories
                };
            } else {
                const categories = await categoriesCollection
                    .find(query)
                    .sort({ sortOrder: 1, createdAt: -1 })
                    .toArray();

                return asTree ? buildTree(categories) : categories;
            }
        });

        res.send(result);

    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

const getSingleCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();
        const categoriesCollection = db.collection("categories");

        const category = await categoriesCollection.findOne(buildIdQuery(id));

        if (!category) {
            return res.status(404).send({ message: "Category not found" });
        }

        res.send(category);

    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();
        const categoriesCollection = db.collection("categories");

        const categoryIdQuery = buildIdQuery(id);
        const existingCategory = await categoriesCollection.findOne(categoryIdQuery);
        if (!existingCategory) {
            return res.status(404).send({ message: "Category not found" });
        }

        // Unique slug check if slug changed
        if (req.body.slug && req.body.slug !== existingCategory.slug) {
            const slug = req.body.slug.trim();
            const existingSlug = await categoriesCollection.findOne({ slug, _id: { $ne: existingCategory._id } });
            if (existingSlug) {
                return res.status(400).send({ message: `Category with slug '${slug}' already exists` });
            }
        }

        // Circular parent dependency check
        if (req.body.parentId !== undefined && req.body.parentId !== existingCategory.parentId) {
            const newParentId = req.body.parentId ? String(req.body.parentId) : null;
            if (newParentId) {
                if (String(newParentId) === String(existingCategory._id)) {
                    return res.status(400).send({ message: "A category cannot be its own parent" });
                }
                const isCircular = await checkCircularDependency(categoriesCollection, existingCategory._id, newParentId);
                if (isCircular) {
                    return res.status(400).send({ message: "Circular parent-child relationship is not allowed" });
                }
            }
        }

        const updateData = {
            ...req.body,
            updatedAt: new Date()
        };

        if (updateData.parentId !== undefined) {
            updateData.parentId = updateData.parentId ? String(updateData.parentId) : null;
        }

        const result = await categoriesCollection.updateOne(
            categoryIdQuery,
            { $set: updateData }
        );

        clearCache();
        res.send({ message: "Category updated successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();
        const categoriesCollection = db.collection("categories");

        const category = await categoriesCollection.findOne(buildIdQuery(id));
        if (!category) {
            return res.status(404).send({ message: "Category not found" });
        }

        // Update any children of this category to have parentId = category.parentId (re-parenting)
        await categoriesCollection.updateMany(
            { parentId: String(category._id) },
            { $set: { parentId: category.parentId || null, updatedAt: new Date() } }
        );

        await categoriesCollection.deleteOne(buildIdQuery(id));

        clearCache();
        res.send({ message: "Category deleted successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

module.exports = {
    createCategory,
    getAllCategories,
    getCategoriesWithCounts,
    getSingleCategory,
    updateCategory,
    deleteCategory
};