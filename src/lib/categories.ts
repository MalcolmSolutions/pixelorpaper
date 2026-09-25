export interface CategoryConfig {
  name: string;
  displayName: string;
  image: string;
}

export const categoryConfigs: Record<string, CategoryConfig> = {
  Landscapes: {
    name: "Landscapes",
    displayName: "Landscapes",
    image: "/images/unframed-logo-editorial.svg", // Replace with actual landscape image
  },
  Cityscapes: {
    name: "Cityscapes",
    displayName: "Cityscapes",
    image: "/images/unframed-logo-editorial.svg", // Replace with actual cityscape image
  },
  Buildings: {
    name: "Buildings",
    displayName: "Buildings",
    image: "/images/unframed-logo-editorial.svg", // Replace with actual buildings image
  },
  Nature: {
    name: "Nature",
    displayName: "Nature",
    image: "/images/unframed-logo-editorial.svg", // Replace with actual nature image
  },
  Misc: {
    name: "Misc",
    displayName: "Miscellaneous",
    image: "/images/unframed-logo-editorial.svg", // Replace with actual misc image
  },
};

export const categoryList = [
  "The Collection",
  "Landscapes",
  "Cityscapes",
  "Buildings",
  "Nature",
  "Misc",
] as const;

export type Category = (typeof categoryList)[number];

export function toCategory(value: string | undefined): Category {
  if (!value) {
    return "The Collection";
  }

  return (categoryList as readonly string[]).includes(value)
    ? (value as Category)
    : "The Collection";
}

export function isMainCategory(category: Category): boolean {
  return category === "The Collection";
}

export function getFilteredCategories(): string[] {
  return categoryList.slice(1); // Exclude "The Collection"
}
