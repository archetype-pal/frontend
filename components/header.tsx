'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCollection } from '@/contexts/collection-context'

import { Search, Home, Menu, X, ChevronDown, FolderOpen } from 'lucide-react'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { items } = useCollection()
  const pathname = usePathname()

  // Helper function to check if a route is active
  const isActive = (href: string, exact: boolean = false) => {
    if (exact) {
      return pathname === href
    }
    return pathname?.startsWith(href)
  }

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
        className={`bg-primary text-primary-foreground p-2 ${
          isMenuOpen ? 'block' : 'hidden'
        } md:block`}
      >
        <div className='container mx-auto'>
          <div className='flex flex-col md:flex-row md:items-center md:justify-between md:flex-wrap gap-4 md:gap-6'>
            <ul className='flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mr-0 md:mr-6'>
              <li>
                <Link href='/'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className={`transition-colors w-full md:w-auto justify-start group ${
                      isActive('/', true)
                        ? 'bg-primary-foreground/30 text-white'
                        : 'text-primary-foreground hover:bg-primary-foreground/20 hover:text-white'
                    }`}
                  >
                    <Home className='h-4 w-4 mr-1 group-hover:scale-110 transition-transform' />
                    Home
                  </Button>
                </Link>
              </li>
              <li>
                <Link href='/search/manuscripts/'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className={`transition-colors w-full md:w-auto justify-start group ${
                      isActive('/search')
                        ? 'bg-primary-foreground/30 text-white'
                        : 'text-primary-foreground hover:bg-primary-foreground/20 hover:text-white'
                    }`}
                  >
                    <Search className='h-4 w-4 mr-1 group-hover:scale-110 transition-transform' />
                    Search
                  </Button>
                </Link>
              </li>
              <li>
                <Link href='/collection'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className={`transition-colors w-full md:w-auto justify-start group ${
                      isActive('/collection', true)
                        ? 'bg-primary-foreground/30 text-white'
                        : 'text-primary-foreground hover:bg-primary-foreground/20 hover:text-white'
                    }`}
                  >
                    <FolderOpen className='h-4 w-4 mr-1 group-hover:scale-110 transition-transform' />
                    My Collection ({items.length})
                  </Button>
                </Link>
              </li>
              <li>
                <Link href='/lightbox'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className={`transition-colors w-full md:w-auto justify-start group ${
                      isActive('/lightbox', true)
                        ? 'bg-primary-foreground/30 text-white'
                        : 'text-primary-foreground hover:bg-primary-foreground/20 hover:text-white'
                    }`}
                  >
                    Lightbox
                  </Button>
                </Link>
              </li>
              <li>
                <Link href='/news/'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className={`transition-colors w-full md:w-auto justify-start ${
                      isActive('/news')
                        ? 'bg-primary-foreground/30 text-white'
                        : 'text-primary-foreground hover:bg-primary-foreground/20 hover:text-white'
                    }`}
                  >
                    News
                  </Button>
                </Link>
              </li>
              <li>
                <Link href='/blogs/'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className={`transition-colors w-full md:w-auto justify-start ${
                      isActive('/blogs')
                        ? 'bg-primary-foreground/30 text-white'
                        : 'text-primary-foreground hover:bg-primary-foreground/20 hover:text-white'
                    }`}
                  >
                    Blogs
                  </Button>
                </Link>
              </li>
              <li>
                <Link href='/feature/'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className={`transition-colors w-full md:w-auto justify-start ${
                      isActive('/feature')
                        ? 'bg-primary-foreground/30 text-white'
                        : 'text-primary-foreground hover:bg-primary-foreground/20 hover:text-white'
                    }`}
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
                      className={`transition-colors w-full md:w-auto justify-start group ${
                        isActive('/events')
                          ? 'bg-primary-foreground/30 text-white'
                          : 'text-primary-foreground hover:bg-primary-foreground/20 hover:text-white'
                      }`}
                    >
                      Past Events
                      <ChevronDown className='ml-1 h-4 w-4 group-hover:scale-110 transition-transform' />
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
                      className={`transition-colors group ${
                        isActive('/about')
                          ? 'bg-primary-foreground/30 text-white'
                          : 'text-primary-foreground hover:bg-primary-foreground/20 hover:text-white'
                      }`}
                    >
                      About <ChevronDown className='ml-1 h-4 w-4 group-hover:scale-110 transition-transform' />
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
              <div className='relative flex-1 w-full md:w-auto'>
                <Input
                  type='search'
                  placeholder='Enter search terms'
                  className='pl-8 bg-background text-foreground w-full'
                />
                <Search className='absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none' />
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}
