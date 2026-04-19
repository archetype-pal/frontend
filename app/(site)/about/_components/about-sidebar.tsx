import Link from 'next/link';

const links = [
  { href: '/about/historical-context', label: 'Historical Context' },
  { href: '/about/about-models-of-authority', label: 'Project Team' },
  { href: '/about/about-models-of-authority', label: 'Citing the Models of Authority database' },
  { href: '/about/about-models-of-authority', label: 'Talks and Publications' },
  { href: '/about/about-models-of-authority', label: 'Acknowledgements and Image Rights' },
  { href: '/about/about-models-of-authority', label: 'Privacy and Cookie Policy' },
  { href: '/about/accessibility', label: 'Accessibility Statement' },
  { href: '/search/manuscripts', label: 'Search' },
  { href: '/about/about-models-of-authority', label: 'About' },
];

export function AboutSidebar() {
  return (
    <aside className="w-full md:w-64">
      <nav className="bg-secondary p-5 rounded-lg border border-border">
        <h2 className="text-xl font-bold mb-4">About</h2>
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.label}>
              <Link href={link.href} className="text-primary hover:underline">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
