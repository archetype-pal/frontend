import Image from 'next/image'

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
      </div>
    </div>
  )
}
