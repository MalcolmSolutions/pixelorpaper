/** Keys of the built-in placeholder artworks (see components/artwork.tsx). */
export type ArtworkKey =
  | "arches"
  | "waves"
  | "orbs"
  | "olive-branch"
  | "sun-hills"
  | "mountains"
  | "blocks"
  | "rings"
  | "shapes";

export type Orientation = "landscape" | "portrait" | "square";

export type ProductImage = {
  src: string;
  /** Intrinsic size; only the ratio matters for layout. */
  width: number;
  height: number;
  alt: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Category slug (the product's folder in the R2 bucket). */
  category: string;
  image: ProductImage;
  orientation: Orientation;
  location?: string;
  keywords: string[];
};

export type ProductSort = "featured" | "name";
