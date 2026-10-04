import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page section space-y-6">
      <h1>Page not found</h1>
      <Link href="/" className="link">
        Back to home
      </Link>
    </div>
  );
}
