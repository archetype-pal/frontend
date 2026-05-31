import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

// lucide-react dropped brand marks (incl. GitHub) in v1, so the GitHub logo is
// rendered as an inline SVG. Uses currentColor to match the adjacent icons.
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

const partners = [
  {
    name: 'Arts & Humanities Research Council',
    logo: '/models_of_authority/Logos/ahrc_logo_small.png',
  },
  {
    name: 'University of Glasgow',
    logo: '/models_of_authority/Logos/uni_glasgow_logo_small.png',
  },
  {
    name: "King's College London",
    logo: '/models_of_authority/Logos/ddh_no_strapline_small.png',
  },
  {
    name: 'University of Cambridge',
    logo: '/models_of_authority/Logos/university_of_cambridge_logo_small.png',
  },
  {
    name: 'National Records of Scotland',
    logo: '/models_of_authority/Logos/nrs-logo_small.png',
  },
  {
    name: 'The National Archives',
    logo: '/models_of_authority/Logos/the-national-archives_logo_small.png',
  },
];

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground mt-16">
      <div className="container mx-auto px-6 py-12">
        {/* Main footer grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* About column */}
          <div className="space-y-3">
            <h2 className="font-serif text-lg font-semibold tracking-tight">Models of Authority</h2>
            <p className="text-sm text-primary-foreground/85 leading-relaxed">
              Scottish Charters and the Emergence of Government, 1100–1250. A resource for the study
              of the contents, script and physical appearance of the corpus of Scottish charters.
            </p>
            <p className="text-sm text-primary-foreground/85">
              Funded by the Arts and Humanities Research Council (AHRC).
            </p>
          </div>

          {/* Links column */}
          <div className="space-y-3">
            <h2 className="font-serif text-lg font-semibold tracking-tight">Quick Links</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/search/manuscripts"
                  className="text-primary-foreground/85 hover:text-white transition-colors"
                >
                  Search Charters
                </Link>
              </li>
              <li>
                <Link
                  href="/about/about-models-of-authority"
                  className="text-primary-foreground/85 hover:text-white transition-colors"
                >
                  About the Project
                </Link>
              </li>
              <li>
                <Link
                  href="/about/accessibility"
                  className="text-primary-foreground/85 hover:text-white transition-colors"
                >
                  Accessibility Statement
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-primary-foreground/85 hover:text-white transition-colors"
                >
                  Log in
                </Link>
              </li>
            </ul>
          </div>

          {/* Partners column */}
          <div className="space-y-3">
            <h2 className="font-serif text-lg font-semibold tracking-tight">Partners</h2>
            <div className="flex flex-wrap gap-4">
              {partners.map((partner) => (
                <div
                  key={partner.name}
                  className="bg-white/90 rounded-md p-2 flex items-center justify-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    width={80}
                    height={40}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-primary-foreground/20 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-primary-foreground/85 text-center md:text-left max-w-2xl">
            ©2015–17 Models of Authority. Some parts available under CC-BY licence. All manuscript
            images are copyright of their respective repositories. Website by DDH / KDL. Built with
            Archetype.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="https://github.com/archetype-pal"
              className="text-primary-foreground/85 hover:text-white transition-colors"
              aria-label="GitHub"
            >
              <GithubIcon className="h-5 w-5" />
            </Link>
            <Link
              href="/about/about-models-of-authority"
              className="text-primary-foreground/85 hover:text-white transition-colors"
              aria-label="Project website"
            >
              <ExternalLink className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
