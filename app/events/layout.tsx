import Link from 'next/link'

export default function DashboardLayout({
  children, // will be a page or nested layout
}: {
  children: React.ReactNode
}) {
  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex flex-col md:flex-row gap-8'>
        <main className='flex-1'>{children}</main>
        <aside className='w-full md:w-64'>
          <nav className='bg-white border border-gray-200 rounded-lg overflow-hidden'>
            <ul className='divide-y divide-gray-200'>
              <li>
                <Link
                  href='/events'
                  className='block px-4 py-2 text-gray-700 hover:bg-gray-50'
                >
                  Past Events
                </Link>
              </li>
              <li>
                <Link
                  href='/events/exhibition/'
                  className='block px-4 py-2 text-gray-700 hover:bg-gray-50'
                >
                  Exhibition
                </Link>
              </li>
              <li>
                <Link
                  href='/events/exhibition-launch/'
                  className='block px-4 py-2 text-white bg-primary hover:primary'
                >
                  Exhibition Launch
                </Link>
              </li>
              <li>
                <Link
                  href='/events/colloquium/'
                  className='block px-4 py-2 text-gray-700 hover:bg-gray-50'
                >
                  Colloquium
                </Link>
              </li>
              <li>
                <Link
                  href='/events/conferece/'
                  className='block px-4 py-2 text-gray-700 hover:bg-gray-50'
                >
                  Public conference
                </Link>
              </li>
            </ul>
          </nav>
        </aside>
      </div>
    </div>
  )
}
