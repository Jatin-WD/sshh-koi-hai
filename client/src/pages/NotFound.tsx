import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-73px)] max-w-3xl items-center justify-center px-6 py-16 text-center">
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-burgundy/70">404</p>
        <h1 className="mt-4 font-display text-4xl text-charcoal">Page not found</h1>
        <p className="mt-4 text-charcoal/70">
          The page you are looking for does not exist.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex rounded-full bg-burgundy px-6 py-3 text-sm font-semibold text-cream shadow-soft"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}

