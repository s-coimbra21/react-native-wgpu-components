import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="mb-4 text-5xl font-bold tracking-tight">
        react-native-wgpu-components
      </h1>
      <p className="mb-8 max-w-xl text-balance text-lg text-fd-muted-foreground">
        GPU-accelerated UI components for React Native — iOS, Android, and Web
        through a single API.
      </p>
      <div className="flex gap-3">
        <Link
          href="/docs"
          className="rounded-lg bg-fd-primary px-5 py-2.5 text-sm font-semibold text-fd-primary-foreground"
        >
          Read the docs
        </Link>
        <a
          href="https://github.com/s-coimbra21/react-native-wgpu-components"
          className="rounded-lg border border-fd-border bg-fd-card px-5 py-2.5 text-sm font-semibold"
        >
          GitHub
        </a>
      </div>
    </main>
  );
}
