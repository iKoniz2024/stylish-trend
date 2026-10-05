const { z } = require("zod");

const createAttributeSchema = z.object({
    name: z.string().min(1, "Attribute name is required"),
    code: z.string().min(1, "Attribute code/key is required"),
    type: z.enum(["text", "number", "select", "multi-select", "boolean", "color"]).default("text"),
    options: z.array(z.string()).optional().default([]),
    unit: z.string().optional().default(""),
    isRequired: z.boolean().optional().default(false),
    isFilterable: z.boolean().optional().default(true),
    isSearchable: z.boolean().optional().default(false),
    useAsVariant: z.boolean().optional().default(false),
    sortOrder: z.number().optional().default(0)
});

const updateAttributeSchema = z.object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    type: z.enum(["text", "number", "select", "multi-select", "boolean", "color"]).optional(),
    options: z.array(z.string()).optional(),
    unit: z.string().optional(),
    isRequired: z.boolean().optional(),
    isFilterable: z.boolean().optional(),
    isSearchable: z.boolean().optional(),
    useAsVariant: z.boolean().optional(),
    sortOrder: z.number().optional()
});

module.exports = {
    createAttributeSchema,
    updateAttributeSchema
};
