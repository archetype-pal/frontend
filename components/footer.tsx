import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const partners = [
  {
    name: 'Arts & Humanities Research Council',
    logo: 'https://www.modelsofauthority.ac.uk/media/uploads/Logos/ahrc_logo_small.png',
  },
  {
    name: 'University of Glasgow',
    logo: 'https://www.modelsofauthority.ac.uk/media/uploads/Logos/uni_glasgow_logo_small.png',
  },
  {
    name: "King's College London",
    logo: 'https://www.modelsofauthority.ac.uk/media/uploads/Logos/ddh_no_strapline_small.png',
  },
  {
    name: 'University of Cambridge',
    logo: 'https://www.modelsofauthority.ac.uk/media/uploads/Logos/university_of_cambridge_logo_small.png',
  },
  {
    name: 'National Records of Scotland',
    logo: 'https://www.modelsofauthority.ac.uk/media/uploads/Logos/nrs-logo_small.png',
  },
  {
    name: 'The National Archives',
    logo: 'https://www.modelsofauthority.ac.uk/media/uploads/Logos/the-national-archives_logo_small.png',
  },
]

export default function Footer() {
  return (
    <footer className='bg-gray-100 mt-8 py-8'>
      <div className='container mx-auto px-4'>
        <div className='flex flex-wrap justify-center items-center mb-8'>
          {partners.map((partner, index) => (
            <div key={index} className='m-4'>
              <Image
                src={partner.logo}
                alt={partner.name}
                width={100}
                height={50}
              />
            </div>
          ))}
        </div>
        <div className='text-center mb-4'>
          <Link href='/accessibility' className='text-blue-600 hover:underline'>
            Accessibility Statement
          </Link>
        </div>
        <p className='text-sm text-gray-600 text-center mb-4'>
          ©2015-17 Models of Authority: Scottish Charters and the Emergence of
          Government, 1100–1250. Some parts of this site are available under a
          CC-BY or other licence. All images of manuscripts and charters on this
          website are copyright of the respective repositories and are
          reproduced with permission. See further Acknowledgements and Image
          Rights.
        </p>
        <p className='text-sm text-gray-600 text-center mb-4'>
          The Models of Authority project is funded by the Arts and Humanities
          Research Council (AHRC) under Grant Reference n° AH/L008041/1.
        </p>
        <p className='text-sm text-gray-600 text-center mb-4'>
          This site uses Cookies. For further details see our Privacy and Cookie
          Policy.
        </p>
        <p className='text-sm text-gray-600 text-center'>
          Website by DDH / KDL. Built with Archetype.
        </p>
        <div className='flex justify-center space-x-4 mt-4'>
          <Button variant='outline' size='icon'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='24'
              height='24'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17'></path>
            </svg>
          </Button>
          <Button variant='outline' size='icon'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='24'
              height='24'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z'></path>
            </svg>
          </Button>
          <Button variant='outline' size='icon'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='24'
              height='24'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22'></path>
            </svg>
          </Button>
        </div>
        <div className='text-center mt-4'>
          <Link href='/login'>
            <Button variant='link' className='text-blue-600'>
              Log in.
            </Button>
          </Link>
        </div>
      </div>
    </footer>
  )
}
