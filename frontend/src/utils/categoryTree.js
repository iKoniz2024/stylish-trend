/**
 * Utility to group flat categories array into parent-child hierarchy tree.
 * Ensures sub-categories with `parentId` remain inside parent's `children` array
 * and never appear as standalone top-level main categories.
 */
export function buildCategoryTree(categories = []) {
  if (!Array.isArray(categories)) return [];

  // Filter top level categories (no parentId, null, or empty string)
  const topCategories = categories.filter((cat) => {
    const pId = typeof cat.parentId === "object" ? cat.parentId?._id : cat.parentId;
    return !pId;
  });

  // If no top categories found but categories exist, fallback to categories
  if (topCategories.length === 0) return categories;

  return topCategories.map((parent) => {
    // Find subcategories in the flat array whose parentId matches parent._id or parent.slug
    const dbSubCats = categories.filter((c) => {
      const pId = typeof c.parentId === "object" ? c.parentId?._id : c.parentId;
      return pId && (String(pId) === String(parent._id) || String(pId) === String(parent.slug));
    });

    const embeddedChildren = Array.isArray(parent.children) ? parent.children : [];

    const combinedChildren = [...dbSubCats];
    embeddedChildren.forEach((emb) => {
      if (!combinedChildren.some((c) => c.slug === emb.slug || String(c._id) === String(emb._id))) {
        combinedChildren.push(emb);
      }
    });

    return {
      ...parent,
      children: combinedChildren,
    };
  });
}
