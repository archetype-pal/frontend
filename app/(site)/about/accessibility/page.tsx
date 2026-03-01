import Link from 'next/link';

export default function AccessibilityStatement() {
  return (
    <div className="container mx-auto px-4 py-8">
      <main className="max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Accessibility Statement</h1>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Our commitment</h2>
          <p className="mb-4">
            The Models of Authority project is committed to making this website accessible to as
            many people as possible. We aim to meet the requirements of the Web Content
            Accessibility Guidelines (WCAG) 2.1 at Level AA where practicable.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Standards and technologies</h2>
          <p className="mb-4">
            This site is built with modern web technologies (HTML5, CSS, JavaScript) and is designed
            to work with current browsers and assistive technologies. We use semantic markup,
            descriptive link text, and appropriate heading structure to support navigation and
            screen readers.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Known limitations</h2>
          <p className="mb-4">
            Some areas of the site (for example, the manuscript image viewer and annotation tools)
            use third-party components that may have accessibility limitations. We continue to
            review and improve these where possible. PDF and image content from external
            repositories may not be fully optimised for accessibility.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Feedback and contact</h2>
          <p className="mb-4">
            If you have difficulty using any part of this site or have suggestions for improvement,
            please contact us. We will do our best to respond and to make the site more accessible
            where we can.
          </p>
          <p className="mb-4">
            The Models of Authority project is based at the University of Glasgow. You can find
            contact details on the{' '}
            <Link href="/about" className="text-primary hover:underline">
              About
            </Link>{' '}
            page.
          </p>
        </section>

        <p className="text-muted-foreground text-sm">
          This statement was last updated in February 2026.
        </p>
      </main>
    </div>
  );
}
