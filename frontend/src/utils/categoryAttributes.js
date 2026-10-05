/**
 * Utility to resolve and merge category attributes with parent-child inheritance.
 * Supports separating attributes into Specifications vs Variants.
 */

export function resolveCategoryAttributes(selectedCategorySlug, categories = []) {
  if (!selectedCategorySlug || !Array.isArray(categories)) {
    return {
      allAttributes: [],
      specifications: [],
      variants: [],
      parentCategory: null,
      childCategory: null,
    };
  }

  let parentCategory = null;
  let childCategory = null;

  // Search categories tree
  for (const parent of categories) {
    if (parent.slug === selectedCategorySlug) {
      parentCategory = parent;
      break;
    }
    if (Array.isArray(parent.children)) {
      const foundChild = parent.children.find((child) => child.slug === selectedCategorySlug);
      if (foundChild) {
        parentCategory = parent;
        childCategory = foundChild;
        break;
      }
    }
  }

  if (!parentCategory) {
    return {
      allAttributes: [],
      specifications: [],
      variants: [],
      parentCategory: null,
      childCategory: null,
    };
  }

  const parentAttrs = Array.isArray(parentCategory.attributes) ? parentCategory.attributes : [];
  const childAttrs = childCategory && Array.isArray(childCategory.attributes) ? childCategory.attributes : [];

  // Map parent attributes by key
  const attributeMap = new Map();

  parentAttrs.forEach((attr) => {
    if (attr && attr.key) {
      attributeMap.set(attr.key, { ...attr, inheritedFromParent: false });
    }
  });

  // Merge child attributes (overriding parent attributes with same key, or adding new ones)
  if (childCategory) {
    // If parent attributes exist, mark them as inherited unless overridden
    attributeMap.forEach((attr) => {
      attr.inheritedFromParent = true;
    });

    childAttrs.forEach((childAttr) => {
      if (childAttr && childAttr.key) {
        attributeMap.set(childAttr.key, { ...childAttr, inheritedFromParent: false });
      }
    });
  }

  const allAttributes = Array.from(attributeMap.values());
  const specifications = allAttributes.filter((attr) => !attr.useAsVariant);
  const variants = allAttributes.filter((attr) => Boolean(attr.useAsVariant));

  return {
    allAttributes,
    specifications,
    variants,
    parentCategory,
    childCategory,
  };
}
