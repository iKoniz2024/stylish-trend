const { z } = require("zod");

const createCollectionSchema = z.object({
    name: z.string().min(2, "Collection name is required"),
    slug: z.string().min(2, "Slug is required"),
    description: z.string().optional().default(""),
    image: z.string().optional().default(""),
    banner: z.string().optional().default(""),
    status: z.enum(["active", "inactive"]).optional().default("active"),
    isFeatured: z.boolean().optional().default(false),
    sortOrder: z.number().optional().default(0),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    metaTitle: z.string().optional().default(""),
    metaDescription: z.string().optional().default("")
});

const updateCollectionSchema = z.object({
    name: z.string().min(2).optional(),
    slug: z.string().min(2).optional(),
    description: z.string().optional(),
    image: z.string().optional(),
    banner: z.string().optional(),
    status: z.enum(["active", "inactive"]).optional(),
    isFeatured: z.boolean().optional(),
    sortOrder: z.number().optional(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional()
});

module.exports = {
    createCollectionSchema,
    updateCollectionSchema
};
