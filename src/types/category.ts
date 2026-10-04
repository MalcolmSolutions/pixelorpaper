import type { WallTone } from "@/types/room";

export type Category = {
  slug: string;
  name: string;
  description: string;
  /** Wall colour used for this category's room mockups. */
  wall: WallTone;
  /** Number of products in the category. */
  count: number;
};
