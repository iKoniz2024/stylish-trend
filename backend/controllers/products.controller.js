const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const { withCache, clearCache } = require("../utils/cache");
const { buildIdQuery } = require("../utils/buildIdQuery");
const { processImageUpload } = require("../utils/uploadHelper");

const createProduct = async (req, res) => {
    try {
        const db = getDB();
        const productsCollection = db.collection("products");

        const {
            title,
            description,
            category,
            primaryCategory,
            categories,
            collectionIds,
            price,
            discountPercentage,
            stock,
            tags,
            brand,
            weight,
            dimensions,
            warrantyInformation,
            shippingInformation,
            returnPolicy,
            minimumOrderQuantity,
            sizes,
            sizeMeasurements,
            colors,
            attributes,
            variants,
            images,
            thumbnail
        } = req.body;

        const normalizedPrice = Number(price ?? 0);
        const normalizedDiscountPercentage = Number(discountPercentage ?? 0);
        const normalizedStock = Number(stock ?? 0);
        const normalizedMinimumOrderQuantity = Number(minimumOrderQuantity ?? 1);

        const resolvedPrimaryCategory = primaryCategory || category || "";
        const resolvedCategories = Array.isArray(categories) && categories.length > 0
            ? categories
            : (resolvedPrimaryCategory ? [resolvedPrimaryCategory] : []);

        const newProduct = {
            title,
            description,
            category: resolvedPrimaryCategory,
            primaryCategory: resolvedPrimaryCategory,
            categories: resolvedCategories,
            collectionIds: Array.isArray(collectionIds) ? collectionIds : [],
            price: normalizedPrice,
            discountPercentage: normalizedDiscountPercentage,
            rating: 0,
            stock: normalizedStock,
            tags: tags || [],
            brand: brand || "",
            sku: `SKU-${Date.now()}`,
            weight: Number(weight ?? 0),

            dimensions: {
                width: dimensions?.width || null,
                height: dimensions?.height || null,
                depth: dimensions?.depth || null
            },

            warrantyInformation,
            shippingInformation,

            availabilityStatus: normalizedStock > 0
                ? "In Stock"
                : "Out of Stock",

            reviews: [],

            returnPolicy,
            minimumOrderQuantity: normalizedMinimumOrderQuantity,
            sizes: sizes || [],
            sizeMeasurements: sizeMeasurements || [],
            colors: Array.isArray(colors)
                ? await Promise.all(colors.map(async (c) => ({ ...c, image: await processImageUpload(c.image) })))
                : [],
            attributes: attributes || {},
            variants: Array.isArray(variants) ? variants : [],

            meta: {
                createdAt: new Date(),
                updatedAt: new Date(),
                barcode: "",
                qrCode: ""
            },

            vendorId: req.user ? req.user.id : null,
            images: Array.isArray(images)
                ? await Promise.all(images.map((img) => processImageUpload(img)))
                : [],
            thumbnail: await processImageUpload(thumbnail || "")
        };

        const result = await productsCollection.insertOne(newProduct);
        clearCache("products");

        res.status(201).send({
            message: "Product created successfully",
            insertedId: result.insertedId
        });

    } catch (error) {
        console.log(error);
        res.status(500).send({
            message: "Internal Server Error"
        });
    }
};

const getBestSellingProductsInternal = async (db) => {
    const productsCollection = db.collection("products");
    const ordersCollection = db.collection("orders");

    let products = [];
    try {
        products = await ordersCollection
            .aggregate([
                { $unwind: "$items" },
                {
                    $project: {
                        productId: {
                            $cond: {
                                if: { $eq: [{ $type: "$items.productId" }, "string"] },
                                then: {
                                    $convert: {
                                        input: "$items.productId",
                                        to: "objectId",
                                        onError: "$items.productId",
                                        onNull: "$items.productId"
                                    }
                                },
                                else: "$items.productId"
                            }
                        },
                        quantity: "$items.quantity"
                    }
                },
                {
                    $group: {
                        _id: "$productId",
                        totalSold: { $sum: "$quantity" }
                    }
                },
                { $sort: { totalSold: -1 } },
                { $limit: 15 },
                {
                    $lookup: {
                        from: "products",
                        localField: "_id",
                        foreignField: "_id",
                        as: "product"
                    }
                },
                { $unwind: "$product" },
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: ["$product", { totalSold: "$totalSold" }]
                        }
                    }
                },
                {
                    $project: {
                        description: 0,
                        dimensions: 0,
                        reviews: 0,
                        images: 0,
                        warrantyInformation: 0,
                        shippingInformation: 0,
                        returnPolicy: 0,
                        meta: 0,
                        tags: 0,
                        sku: 0,
                        weight: 0,
                        availabilityStatus: 0,
                        minimumOrderQuantity: 0
                    }
                }
            ])
            .toArray();
    } catch (e) {
        console.error("Best-selling aggregation failed, using fallback:", e.message);
    }

    if (!Array.isArray(products)) {
        products = [];
    }

    return products.map(product => ({
        ...product,
        badge: "best-seller"
    }));
};

const getBestSellingIds = async (db) => {
    return await withCache("bestSellingIdsSet", 300, async () => {
        const bestProducts = await getBestSellingProductsInternal(db);
        return Array.from(new Set(bestProducts.map(p => (p._id ? p._id.toString() : ""))));
    });
};

const getAllProducts = async (req, res) => {

    try {
        const db = getDB();
        const productsCollection = db.collection("products");

        const page = req.query.page ? parseInt(req.query.page) : null;
        const limit = req.query.limit ? parseInt(req.query.limit) : null;

        const search = req.query.search || "";
        const category = req.query.category || "";
        const collection = req.query.collection || "";
        const brand = req.query.brand || "";
        const sort = req.query.sort || "";

        const andConditions = [];
        const escapeRegex = (str) => str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

        if (search && search.trim()) {
            const rawSearch = search.trim();
            const terms = rawSearch.split(/\s+/).filter(Boolean);
            
            const termConditions = terms.map((rawTerm) => {
                const escapedTerm = escapeRegex(rawTerm);
                const isShort = rawTerm.length <= 2;
                
                // Match word boundaries for short terms, substring for longer terms
                const wordBoundaryRegex = { $regex: `(?:^|\\s|[-_/])${escapedTerm}`, $options: "i" };
                const containsRegex = { $regex: escapedTerm, $options: "i" };
                const matchPattern = isShort ? wordBoundaryRegex : containsRegex;

                const searchFields = [
                    { title: matchPattern },
                    { brand: matchPattern },
                    { tags: matchPattern },
                    { sku: matchPattern }
                ];

                if (!isShort) {
                    searchFields.push({ description: { $regex: `(?:^|\\s|[-_/])${escapedTerm}`, $options: "i" } });
                }

                return { $or: searchFields };
            });

            if (termConditions.length > 0) {
                andConditions.push({ $and: termConditions });
            }
        }

        if (category && category.trim()) {
            const categoriesArray = category.split(",").map(c => c.trim()).filter(Boolean);
            if (categoriesArray.length > 0) {
                const categoryConditions = categoriesArray.flatMap(c => {
                    const regex = { $regex: `^${escapeRegex(c)}$`, $options: "i" };
                    return [
                        { category: regex },
                        { primaryCategory: regex },
                        { categories: regex },
                        { categories: c }
                    ];
                });
                andConditions.push({ $or: categoryConditions });
            }
        }

        if (collection && collection.trim()) {
            const collectionsArray = collection.split(",").map(c => c.trim()).filter(Boolean);
            if (collectionsArray.length > 0) {
                andConditions.push({
                    $or: collectionsArray.map(c => ({
                        collectionIds: { $in: [c, new RegExp(`^${escapeRegex(c)}$`, "i")] }
                    }))
                });
            }
        }

        if (brand && brand.trim()) {
            andConditions.push({ brand: { $regex: `^${escapeRegex(brand.trim())}$`, $options: "i" } });
        }

        const vendorQueryId = req.user && req.user.role === "vendor"
            ? req.user.id.toString()
            : (req.query.vendorId ? req.query.vendorId.trim() : "");

        if (vendorQueryId) {
            andConditions.push({ vendorId: vendorQueryId });
        }

        const query = andConditions.length > 0 ? { $and: andConditions } : {};

        let sortOption = { _id: -1 };

        if (sort === "asc") {
            sortOption = { price: 1 };
        } else if (sort === "desc") {
            sortOption = { price: -1 };
        }

        const cacheKey = `products_${page}_${limit}_${search}_${category}_${collection}_${brand}_${sort}_${vendorQueryId}`;
        const result = await withCache(cacheKey, 60, async () => {
            const bestSellingIds = await getBestSellingIds(db);
            const bestSellingIdsSet = new Set(bestSellingIds);

            const formatProducts = (prods) => {
                const formatted = prods.map(p => ({
                    ...p,
                    badge: p.badge || (bestSellingIdsSet.has(p._id ? p._id.toString() : "") ? "best-seller" : null)
                }));

                if (!search || !search.trim()) return formatted;
                const lowerSearch = search.trim().toLowerCase();
                return formatted.sort((a, b) => {
                    const aTitle = (a.title || "").toLowerCase();
                    const bTitle = (b.title || "").toLowerCase();
                    const aStarts = aTitle.startsWith(lowerSearch);
                    const bStarts = bTitle.startsWith(lowerSearch);
                    if (aStarts && !bStarts) return -1;
                    if (!aStarts && bStarts) return 1;
                    const aIncludes = aTitle.includes(lowerSearch);
                    const bIncludes = bTitle.includes(lowerSearch);
                    if (aIncludes && !bIncludes) return -1;
                    if (!aIncludes && bIncludes) return 1;
                    return 0;
                });
            };

            if (page && limit) {
                const skip = (page - 1) * limit;
                const totalProducts = Object.keys(query).length === 0
                    ? await productsCollection.estimatedDocumentCount()
                    : await productsCollection.countDocuments(query);

                const products = await productsCollection
                    .find(query)
                    .project({
                        description: 0,
                        dimensions: 0,
                        reviews: 0,
                        images: 0,
                        warrantyInformation: 0,
                        shippingInformation: 0,
                        returnPolicy: 0,
                        tags: 0,
                        sku: 0,
                        weight: 0,
                        availabilityStatus: 0,
                        minimumOrderQuantity: 0
                    })
                    .sort(sortOption)
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                return {
                    totalProducts,
                    currentPage: page,
                    totalPages: Math.ceil(totalProducts / limit),
                    products: formatProducts(products),
                };
            } else {
                const products = await productsCollection
                    .find(query)
                    .project({
                        description: 0,
                        dimensions: 0,
                        reviews: 0,
                        images: 0,
                        warrantyInformation: 0,
                        shippingInformation: 0,
                        returnPolicy: 0,
                        tags: 0,
                        sku: 0,
                        weight: 0,
                        availabilityStatus: 0,
                        minimumOrderQuantity: 0
                    })
                    .sort(sortOption)
                    .limit(100)
                    .toArray();

                return {
                    totalProducts: products.length,
                    products: formatProducts(products),
                };
            }
        });

        res.send(result);

    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

const getSingleProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();
        const productsCollection = db.collection("products");

        const result = await withCache(`product_${id}`, 120, async () => {
            return await productsCollection.findOne(buildIdQuery(id));
        });

        if (!result) {
            return res.status(404).send({ message: "Product not found" });
        }

        res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
        res.send(result);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();
        const productsCollection = db.collection("products");

        const existingProduct = await productsCollection.findOne(buildIdQuery(id));
        if (!existingProduct) {
            return res.status(404).send({ message: "Product not found" });
        }

        // Strict ownership enforcement for ALL users (including Admin)
        if (req.user) {
            const currentUserId = req.user.id.toString();
            const productVendorId = existingProduct.vendorId ? existingProduct.vendorId.toString() : null;
            if (!productVendorId || productVendorId !== currentUserId) {
                return res.status(403).send({ message: "Forbidden. You can only modify your own products." });
            }
        }

        const primaryCategory = req.body.primaryCategory || req.body.category || existingProduct.primaryCategory || existingProduct.category || "";
        const categories = req.body.categories && Array.isArray(req.body.categories) && req.body.categories.length > 0
            ? req.body.categories
            : (existingProduct.categories || (primaryCategory ? [primaryCategory] : []));

        const updatedFields = {
            ...req.body,
            category: primaryCategory,
            primaryCategory,
            categories,
            ...(req.body.collectionIds !== undefined && { collectionIds: Array.isArray(req.body.collectionIds) ? req.body.collectionIds : [] }),
            ...(req.body.attributes !== undefined && { attributes: req.body.attributes }),
            ...(req.body.variants !== undefined && { variants: Array.isArray(req.body.variants) ? req.body.variants : [] }),
            ...(req.body.price !== undefined && { price: Number(req.body.price) }),
            ...(req.body.discountPercentage !== undefined && { discountPercentage: Number(req.body.discountPercentage) }),
            ...(req.body.stock !== undefined && { stock: Number(req.body.stock) }),
            ...(req.body.weight !== undefined && { weight: Number(req.body.weight) }),
            ...(req.body.minimumOrderQuantity !== undefined && { minimumOrderQuantity: Number(req.body.minimumOrderQuantity) }),
            "meta.updatedAt": new Date()
        };

        await productsCollection.updateOne(
            buildIdQuery(id),
            { $set: updatedFields }
        );

        clearCache("products");
        res.send({ message: "Product updated successfully" });

    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();
        const productsCollection = db.collection("products");

        const existingProduct = await productsCollection.findOne(buildIdQuery(id));
        if (!existingProduct) {
            return res.status(404).send({ message: "Product not found" });
        }

        // Strict ownership enforcement for ALL users (including Admin)
        if (req.user) {
            const currentUserId = req.user.id.toString();
            const productVendorId = existingProduct.vendorId ? existingProduct.vendorId.toString() : null;
            if (!productVendorId || productVendorId !== currentUserId) {
                return res.status(403).send({ message: "Forbidden. You can only delete your own products." });
            }
        }

        await productsCollection.deleteOne(buildIdQuery(id));

        clearCache("products");
        res.send({ message: "Product deleted successfully" });

    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

const getFlashSaleProducts = async (req, res) => {
    try {
        const { products, maxStock } = await withCache("flashSaleProducts", 120, async () => {
            const db = getDB();
            const productsCollection = db.collection("products");

            const products = await productsCollection
                .aggregate([
                    {
                        $match: {
                            discountPercentage: { $gte: 50 },
                            stock: { $gt: 0 }
                        }
                    },
                    {
                        $project: {
                            description: 0,
                            dimensions: 0,
                            reviews: 0,
                            images: 0,
                            warrantyInformation: 0,
                            shippingInformation: 0,
                            returnPolicy: 0,
                            meta: 0,
                            tags: 0,
                            sku: 0,
                            weight: 0,
                            availabilityStatus: 0,
                            minimumOrderQuantity: 0
                        }
                    },
                    {
                        $sort: {
                            discountPercentage: -1
                        }
                    },
                    {
                        $limit: 8
                    }
                ])
                .toArray();

            const maxStockResult = await productsCollection
                .aggregate([
                    {
                        $match: {
                            discountPercentage: { $gte: 50 },
                            stock: { $gt: 0 }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            maxStock: { $max: "$stock" }
                        }
                    }
                ])
                .toArray();

            const maxStock = maxStockResult.length > 0 ? maxStockResult[0].maxStock : 1;
            return { products, maxStock };
        });

        res.send({ products, maxStock });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

const getBestSellingProducts = async (req, res) => {
    try {
        const result = await withCache("bestSellingProducts", 120, async () => {
            const db = getDB();
            return await getBestSellingProductsInternal(db);
        });

        res.send({ products: result });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

const getNewArrivals = async (req, res) => {
    try {
        const products = await withCache("newArrivals", 120, async () => {
            const db = getDB();
            const productsCollection = db.collection("products");

            return await productsCollection
                .find({})
                .project({
                    description: 0,
                    dimensions: 0,
                    reviews: 0,
                    images: 0,
                    warrantyInformation: 0,
                    shippingInformation: 0,
                    returnPolicy: 0,
                    meta: 0,
                    tags: 0,
                    sku: 0,
                    weight: 0,
                    availabilityStatus: 0,
                    minimumOrderQuantity: 0
                })
                .sort({
                    _id: -1
                })
                .limit(12)
                .toArray();
        });

        res.send({ products });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

const getLatestReviews = async (req, res) => {
    try {
        const reviews = await withCache("latestReviews", 15, async () => {
            const db = getDB();
            const productsCollection = db.collection("products");

            // We only look at products that have reviews to reduce the pipeline size
            return await productsCollection.aggregate([
                { $match: { "reviews.0": { $exists: true } } },
                { $unwind: "$reviews" },
                { $replaceRoot: { newRoot: { $mergeObjects: ["$reviews", { productName: "$title" }] } } },
                { $sort: { date: -1 } },
                { $limit: 10 }
            ]).toArray();
        });

        res.send({ reviews });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

const getFeaturedProducts = async (req, res) => {
    try {
        const products = await withCache("featuredProducts", 15, async () => {
            const db = getDB();
            const productsCollection = db.collection("products");

            return await productsCollection
                .find({})
                .project({
                    description: 0,
                    dimensions: 0,
                    reviews: 0,
                    images: 0,
                    warrantyInformation: 0,
                    shippingInformation: 0,
                    returnPolicy: 0,
                    meta: 0,
                    tags: 0,
                    sku: 0,
                    weight: 0,
                    availabilityStatus: 0,
                    minimumOrderQuantity: 0
                })
                .sort({ rating: -1 })
                .limit(20)
                .toArray();
        });

        res.send({ products });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};

module.exports = {
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
};