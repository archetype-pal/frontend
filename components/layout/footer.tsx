import Link from 'next/link';
import { Github, ExternalLink } from 'lucide-react';

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
            <h3 className="font-serif text-lg font-semibold tracking-tight">Models of Authority</h3>
            <p className="text-sm text-primary-foreground/70 leading-relaxed">
              Scottish Charters and the Emergence of Government, 1100–1250. A resource for the study
              of the contents, script and physical appearance of the corpus of Scottish charters.
            </p>
            <p className="text-sm text-primary-foreground/70">
              Funded by the Arts and Humanities Research Council (AHRC).
            </p>
          </div>

          {/* Links column */}
          <div className="space-y-3">
            <h3 className="font-serif text-lg font-semibold tracking-tight">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/search/manuscripts"
                  className="text-primary-foreground/70 hover:text-white transition-colors"
                >
                  Search Charters
                </Link>
              </li>
              <li>
                <Link
                  href="/about/about-models-of-authority"
                  className="text-primary-foreground/70 hover:text-white transition-colors"
                >
                  About the Project
                </Link>
              </li>
              <li>
                <Link
                  href="/about/accessibility"
                  className="text-primary-foreground/70 hover:text-white transition-colors"
                >
                  Accessibility Statement
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-primary-foreground/70 hover:text-white transition-colors"
                >
                  Log in
                </Link>
              </li>
            </ul>
          </div>

          {/* Partners column */}
          <div className="space-y-3">
            <h3 className="font-serif text-lg font-semibold tracking-tight">Partners</h3>
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
          <p className="text-xs text-primary-foreground/50 text-center md:text-left max-w-2xl">
            ©2015–17 Models of Authority. Some parts available under CC-BY licence. All manuscript
            images are copyright of their respective repositories. Website by DDH / KDL. Built with
            Archetype.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="https://github.com/archetype-pal"
              className="text-primary-foreground/50 hover:text-white transition-colors"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </Link>
            <Link
              href="/about/about-models-of-authority"
              className="text-primary-foreground/50 hover:text-white transition-colors"
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
