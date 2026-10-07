import { drizzle } from "drizzle-orm/d1";
import { getDb } from "@/lib/db";
import * as schema from "@/db/schema";

/** Drizzle over the D1 database (binding `DB`). */
export async function getDrizzle() {
  return drizzle(await getDb(), { schema });
}
