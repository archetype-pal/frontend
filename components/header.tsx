'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { Search, Home, Settings, Menu, X, ChevronDown } from 'lucide-react'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className='bg-gray-100 border-b border-gray-200'>
      <div className='container mx-auto py-2'>
        <div className='flex justify-between items-center mb-4'>
          <div className='flex flex-col md:flex-row items-start md:items-end'>
            <h1 className='text-4xl md:text-4xl font-serif text-primary leading-tight mb-2 md:mb-0 md:mr-6'>
              Models of Authority
            </h1>
            <div className='text-lg md:text-base text-[#555] border-l-2 border-primary font-sans max-w-md pl-4'>
              <p>Scottish Charters</p>
              <p>and the Emergence of Government 1100-1250</p>
            </div>
          </div>
          <Button
            variant='ghost'
            size='icon'
            className='md:hidden'
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className='h-6 w-6' />
            ) : (
              <Menu className='h-6 w-6' />
            )}
          </Button>
        </div>
      </div>
      <nav
        className={`bg-primary text-white p-2 ${
          isMenuOpen ? 'block' : 'hidden md:block'
        }`}
      >
        <div className='container mx-auto'>
          <div className='flex flex-col md:flex-row md:items-center md:justify-between md:flex-wrap gap-4 md:gap-6'>
            <ul className='flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mr-0 md:mr-6'>
              <li>
                <Link href='/'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='text-white hover:text-primary w-full md:w-auto justify-start'
                  >
                    <Home className='h-4 w-4 mr-1' />
                    Home
                  </Button>
                </Link>
              </li>
              <li>
                <Button
                  variant='ghost'
                  size='sm'
                  className='text-white hover:text-primary w-full md:w-auto justify-start'
                >
                  My Collection (0)
                </Button>
              </li>
              <li>
                <Button
                  variant='ghost'
                  size='sm'
                  className='text-white hover:text-primary w-full md:w-auto justify-start'
                >
                  Lightbox
                </Button>
              </li>
              <li>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='text-white hover:text-primary w-full md:w-auto justify-start'
                    >
                      News & Blog
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Latest News</DropdownMenuItem>
                    <DropdownMenuItem>Archive</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
              <li>
                <Link href='/feature-of-the-month/'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='text-white hover:text-primary w-full md:w-auto justify-start'
                  >
                    Feature Articles
                  </Button>
                </Link>
              </li>
              <li>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='text-white hover:text-primary w-full md:w-auto justify-start'
                    >
                      Past Events
                      <ChevronDown className='ml-1 h-4 w-4' />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent>
                    <DropdownMenuItem>
                      <Link href='/events/exhibition/'>Exhibition</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href='/events/exhibition-launch/'>
                        Exhibition Launch
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href='/events/colloquium/'>Colloquium</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href='/events/conference/'>Public conference</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
              <li>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='ghost'
                      className='text-white  hover:text-primary'
                    >
                      About <ChevronDown className='ml-1 h-4 w-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className='w-56'>
                    <DropdownMenuItem>
                      <Link href='/about/historical-context'>
                        Historical Context
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href='/about/project-team'>Project Team</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href='/about/citing-database'>
                        Citing the Models of Authority database
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href='/about/talks-publications'>
                        Talks and Publications
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href='/about/acknowledgements'>
                        Acknowledgements and Image Rights
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href='/about/privacy-policy'>
                        Privacy and Cookie Policy
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href='/about/accessibility'>
                        Accessibility Statement
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href='/about'>About</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            </ul>
            <div className='flex flex-col md:flex-row items-center gap-3 w-full md:w-auto md:max-w-xl'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='secondary'
                    size='sm'
                    className='whitespace-nowrap w-full md:w-auto'
                  >
                    Database
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Option 1</DropdownMenuItem>
                  <DropdownMenuItem>Option 2</DropdownMenuItem>
                  <DropdownMenuItem>Option 3</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className='relative flex-1 w-full md:w-auto'>
                <Input
                  type='search'
                  placeholder='Enter search terms'
                  className='pl-8 bg-white text-primary w-full'
                />
                <Search className='absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary' />
              </div>
              <Button type='submit' size='icon' variant='secondary'>
                <Settings className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}
