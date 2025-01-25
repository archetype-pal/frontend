import Image from 'next/image'
import Link from 'next/link'

export default function ExhibitionLaunch() {
  return (
    <div className='container mx-auto px-4 py-8'>
      <h1 className='text-3xl font-bold text-gray-700 mb-6'>
        Exhibition Launch
      </h1>
      <div className='flex flex-col md:flex-row gap-8'>
        <main className='flex-1'>
          <Image
            src='https://www.modelsofauthority.ac.uk/media/uploads/Events/.thumbnails/banner.jpg/banner-1437x349.jpg'
            alt="SCRIBES AND ROYAL AUTHORITY: Scotland's Charters 1100-1250"
            width={600}
            height={200}
            className='w-full mb-4'
          />
          <p className='italic text-gray-600 mb-4'>
            An exhibition at the National Records of Scotland.
          </p>
          <p className='mb-2'>
            Launch by <span className='font-semibold'>Leslie Evans</span>{' '}
            (Scottish Government Permanent Secretary)
          </p>
          <p className='mb-2'>Tuesday 4th April 2017, 6pm - 8pm</p>
          <p className='mb-4'>
            Adam Dome, HM General Register House, 2 Princes Street, Edinburgh
          </p>
          <p className='mb-4'>
            This event will be an opportunity to see some of the earliest
            medieval Scottish charters which give a new perspective on the
            origins of Scottish government.
          </p>
          <p>Wine & nibbles will be served.</p>
        </main>
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
                  className='block px-4 py-2 text-white bg-blue-600 hover:bg-blue-700'
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
