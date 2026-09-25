export const productCategories = [
  "Landscapes",
  "Cityscapes",
  "Buildings",
  "Nature",
  "Misc",
] as const;

export type ProductCategory = (typeof productCategories)[number];

export type Product = {
  id: string;
  title: string;
  artist: string;
  description: string;
  category: ProductCategory;
  priceCents: number;
  image: string;
  downloadKey: string;
  size: string;
};
