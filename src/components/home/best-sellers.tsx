import { ProductCard } from "@/components/product-card";
import { SectionHeading } from "@/components/section-heading";
import type { Product } from "@/types/product";

export function BestSellers({ products }: { products: Product[] }) {
  return (
    <section className="container-page pb-section">
      <SectionHeading
        title="Best sellers"
        link={{ href: "/products", label: "View all prints" }}
      />
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
