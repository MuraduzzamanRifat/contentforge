import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-foreground">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        404
      </p>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        That route doesn&apos;t exist in ContentForge.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
      >
        Back to ContentForge
      </Link>
    </div>
  );
}
