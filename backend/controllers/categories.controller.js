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
            const combinedChildren = [];
            const processedSlugs = new Set();

            childItems.forEach(child => {
                const matchingEmbedded = embeddedChildren.find(e => e.slug === child.slug || String(e._id || e.id) === String(child._id));
                const attributes = matchingEmbedded && Array.isArray(matchingEmbedded.attributes)
                    ? matchingEmbedded.attributes
                    : (Array.isArray(child.attributes) ? child.attributes : []);

                combinedChildren.push({
                    ...child,
                    attributes
                });
                if (child.slug) processedSlugs.add(child.slug);
                if (child._id) processedSlugs.add(String(child._id));
            });

            embeddedChildren.forEach(emb => {
                const embIdStr = String(emb._id || emb.id || emb.slug);
                if (!processedSlugs.has(emb.slug) && !processedSlugs.has(embIdStr)) {
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

        if (parentId) {
            const parentCat = await categoriesCollection.findOne(buildIdQuery(parentId));
            if (parentCat) {
                const childItem = {
                    _id: result.insertedId,
                    name: category.name,
                    slug: category.slug,
                    attributes: category.attributes,
                    image: category.image
                };
                await categoriesCollection.updateOne(
                    { _id: parentCat._id },
                    { $push: { children: childItem } }
                );
            }
        }

        clearCache("categories");

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

        let category = await categoriesCollection.findOne(buildIdQuery(id));
        if (!category) {
            category = await categoriesCollection.findOne({ slug: id });
        }

        if (!category) {
            const parentDoc = await categoriesCollection.findOne({
                $or: [
                    { "children._id": ObjectId.isValid(id) ? new ObjectId(id) : id },
                    { "children._id": String(id) },
                    { "children.id": String(id) },
                    { "children.slug": String(id) }
                ]
            });
            if (parentDoc) {
                const child = (parentDoc.children || []).find(
                    (c) => c.slug === id || String(c._id) === String(id) || String(c.id) === String(id)
                );
                if (child) {
                    category = { ...child, parentId: parentDoc._id };
                }
            }
        }

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

        const reqSlug = req.body.slug ? req.body.slug.trim().toLowerCase().replace(/\s+/g, "-") : null;
        const reqName = req.body.name ? req.body.name.trim() : null;

        // 1. Find standalone document by _id or slug
        let categoryIdQuery = buildIdQuery(id);
        let existingCategory = await categoriesCollection.findOne(categoryIdQuery);

        if (!existingCategory && reqSlug) {
            existingCategory = await categoriesCollection.findOne({ slug: reqSlug });
        }

        let updatedAny = false;

        // If standalone category document exists, update it
        if (existingCategory) {
            // Unique slug check if slug changed
            if (reqSlug && reqSlug !== existingCategory.slug) {
                const existingSlug = await categoriesCollection.findOne({ slug: reqSlug, _id: { $ne: existingCategory._id } });
                if (existingSlug) {
                    return res.status(400).send({ message: `Category with slug '${reqSlug}' already exists` });
                }
            }

            let newParentId = req.body.parentId !== undefined ? (req.body.parentId ? String(req.body.parentId) : null) : existingCategory.parentId;

            // Circular dependency check
            if (newParentId && String(newParentId) !== String(existingCategory.parentId || "")) {
                const isCircular = await checkCircularDependency(categoriesCollection, existingCategory._id, newParentId);
                if (isCircular) {
                    return res.status(400).send({ message: "Cannot set a category as a child of itself or its subcategory" });
                }
            }

            const updateData = {
                ...req.body,
                updatedAt: new Date()
            };

            delete updateData._id;
            delete updateData.id;

            if (reqSlug) updateData.slug = reqSlug;
            if (reqName) updateData.name = reqName;
            if (req.body.parentId !== undefined) {
                updateData.parentId = newParentId;
            }

            await categoriesCollection.updateOne(
                { _id: existingCategory._id },
                { $set: updateData }
            );

            // Handle parent change: pull from old parent(s), push to new parent if assigned
            const oldParentId = existingCategory.parentId;
            if (req.body.parentId !== undefined && String(oldParentId) !== String(newParentId)) {
                // Remove from all old parents
                await categoriesCollection.updateMany(
                    {
                        $or: [
                            { "children._id": existingCategory._id },
                            { "children._id": String(existingCategory._id) },
                            { "children.slug": existingCategory.slug }
                        ]
                    },
                    {
                        $pull: {
                            children: {
                                $or: [
                                    { _id: existingCategory._id },
                                    { _id: String(existingCategory._id) },
                                    { slug: existingCategory.slug }
                                ]
                            }
                        }
                    }
                );

                // Add to new parent if assigned
                if (newParentId) {
                    const newParentDoc = await categoriesCollection.findOne(buildIdQuery(newParentId));
                    if (newParentDoc) {
                        const childItem = {
                            _id: existingCategory._id,
                            name: reqName || existingCategory.name,
                            slug: reqSlug || existingCategory.slug,
                            attributes: Array.isArray(req.body.attributes) ? req.body.attributes : (existingCategory.attributes || []),
                            image: req.body.image !== undefined ? req.body.image : (existingCategory.image || "")
                        };
                        await categoriesCollection.updateOne(
                            { _id: newParentDoc._id },
                            { $push: { children: childItem } }
                        );
                    }
                }
            }

            updatedAny = true;
        }

        // 2. Always find any parent documents containing this subcategory in their `children` array and update them
        const searchSlug = reqSlug || existingCategory?.slug || String(id).trim();
        const searchName = reqName ? reqName.toLowerCase() : existingCategory?.name?.toLowerCase();
        const searchIdStr = existingCategory ? String(existingCategory._id) : String(id);

        const parentDocs = await categoriesCollection.find({
            $or: [
                { "children._id": ObjectId.isValid(searchIdStr) ? new ObjectId(searchIdStr) : searchIdStr },
                { "children._id": searchIdStr },
                { "children.id": searchIdStr },
                { "children.slug": searchSlug },
                { "children.slug": String(id).trim() },
                ...(existingCategory?.parentId ? [buildIdQuery(existingCategory.parentId)] : [])
            ]
        }).toArray();

        for (const parentDoc of parentDocs) {
            if (Array.isArray(parentDoc.children) && parentDoc.children.length > 0) {
                let childMatched = false;
                const updatedChildren = parentDoc.children.map((child) => {
                    const childIdStr = child._id ? String(child._id) : String(child.id || "");
                    const childSlug = child.slug ? String(child.slug).toLowerCase() : "";
                    const childName = child.name ? String(child.name).toLowerCase() : "";

                    const isMatch = (childIdStr && childIdStr === searchIdStr) || 
                                    (childSlug && (childSlug === searchSlug || childSlug === String(id).trim())) || 
                                    (searchName && childName === searchName);

                    if (isMatch) {
                        childMatched = true;
                        return {
                            ...child,
                            name: reqName || child.name,
                            slug: reqSlug || child.slug,
                            attributes: Array.isArray(req.body.attributes) ? req.body.attributes : (child.attributes || []),
                            image: req.body.image !== undefined ? req.body.image : child.image,
                            updatedAt: new Date()
                        };
                    }
                    return child;
                });

                if (childMatched) {
                    await categoriesCollection.updateOne(
                        { _id: parentDoc._id },
                        { $set: { children: updatedChildren, updatedAt: new Date() } }
                    );
                    updatedAny = true;
                }
            }
        }

        if (!updatedAny && !existingCategory) {
            return res.status(404).send({ message: "Category not found" });
        }

        clearCache("categories");
        const freshCategory = existingCategory ? await categoriesCollection.findOne({ _id: existingCategory._id }) : null;
        return res.send({ message: "Category updated successfully", category: freshCategory });

    } catch (error) {
        console.error("updateCategory error:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();
        const categoriesCollection = db.collection("categories");

        let category = await categoriesCollection.findOne(buildIdQuery(id));
        if (!category) {
            category = await categoriesCollection.findOne({ slug: id });
        }

        if (category) {
            await categoriesCollection.updateMany(
                { parentId: String(category._id) },
                { $set: { parentId: category.parentId || null, updatedAt: new Date() } }
            );

            await categoriesCollection.deleteOne({ _id: category._id });

            // Also pull from any parent children array by _id, string _id, id, or slug
            await categoriesCollection.updateMany(
                {
                    $or: [
                        { "children.slug": category.slug },
                        { "children._id": category._id },
                        { "children._id": String(category._id) },
                        { "children.id": String(category._id) }
                    ]
                },
                {
                    $pull: {
                        children: {
                            $or: [
                                { slug: category.slug },
                                { _id: category._id },
                                { _id: String(category._id) },
                                { id: String(category._id) }
                            ]
                        }
                    }
                }
            );
        } else {
            // Remove from parent children array if embedded
            await categoriesCollection.updateMany(
                {
                    $or: [
                        { "children._id": ObjectId.isValid(id) ? new ObjectId(id) : id },
                        { "children._id": String(id) },
                        { "children.id": String(id) },
                        { "children.slug": String(id) }
                    ]
                },
                {
                    $pull: {
                        children: {
                            $or: [
                                { _id: ObjectId.isValid(id) ? new ObjectId(id) : id },
                                { _id: String(id) },
                                { id: String(id) },
                                { slug: String(id) }
                            ]
                        }
                    }
                }
            );
        }

        clearCache("categories");
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