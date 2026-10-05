const { z } = require("zod");

const attributeDefSchema = z.object({
    key: z.string().optional().default(""),
    label: z.string().optional().default(""),
    type: z.string().optional().default("text"),
    options: z.array(z.string()).optional().default([]),
    required: z.boolean().optional().default(false),
    unit: z.string().optional().default(""),
    useAsVariant: z.boolean().optional().default(false)
});

const createCategorySchema = z.object({
    name: z.string().min(2, "Category name is required"),
    slug: z.string().min(2, "Slug is required"),
    parentId: z.string().nullable().optional().default(null),
    description: z.string().optional().default(""),
    image: z.string().optional().default(""),
    banner: z.string().optional().default(""),
    icon: z.string().optional().default(""),
    status: z.enum(["active", "inactive"]).optional().default("active"),
    sortOrder: z.number().optional().default(0),
    isFeatured: z.boolean().optional().default(false),
    isVisibleInMenu: z.boolean().optional().default(true),
    isVisibleInHome: z.boolean().optional().default(true),
    attributeIds: z.array(z.string()).optional().default([]),
    attributes: z.array(attributeDefSchema).optional().default([]),
    children: z.array(z.any()).optional().default([]),
    metaTitle: z.string().optional().default(""),
    metaDescription: z.string().optional().default(""),
    keywords: z.array(z.string()).optional().default([])
});

const updateCategorySchema = z.object({
    name: z.string().min(2).optional(),
    slug: z.string().min(2).optional(),
    parentId: z.string().nullable().optional(),
    description: z.string().optional(),
    image: z.string().optional(),
    banner: z.string().optional(),
    icon: z.string().optional(),
    status: z.enum(["active", "inactive"]).optional(),
    sortOrder: z.number().optional(),
    isFeatured: z.boolean().optional(),
    isVisibleInMenu: z.boolean().optional(),
    isVisibleInHome: z.boolean().optional(),
    attributeIds: z.array(z.string()).optional(),
    attributes: z.array(attributeDefSchema).optional(),
    children: z.array(z.any()).optional(),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    keywords: z.array(z.string()).optional()
});

module.exports = {
    createCategorySchema,
    updateCategorySchema
};