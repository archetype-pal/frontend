export function PageBanner({ title }: { title: string }) {
  return (
    <div className="bg-primary py-10">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight text-primary-foreground mb-2">
          {title}
        </h1>
        <span className="block w-12 h-1 bg-accent rounded-full" />
      </div>
    </div>
  );
}
