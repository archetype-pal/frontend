import Link from 'next/link'

const articles = [
  {
    title:
      "Barrow's Scribes and MoA's hands: Scribal Identification in G.W.S. Barrow's Regesta Regum Scottorum II",
    author: 'Alice Taylor',
    date: '14 Apr 2016',
    comments: 0,
    excerpt:
      "The first major attempt to identify scribes of Scottish charters (of any kind) was in G.W.S. Barrow's Regesta Regum Scottorum II: The Acts of William I, 1165–1214 (Edinburgh University Press, 1971, with the collaboration of W.W. Scott)...",
    featureArticle:
      'Feature Article 8: Alice Taylor (Co-Investigator), in consultation with Teresa Webber (Co-Investigator)',
  },
  {
    title:
      'The Standardisation of Diplomatic in Scottish Royal Acts down to 1249. Part 2: Letters with Notification',
    author: 'John Davies',
    date: '29 Feb 2016',
    comments: 0,
    excerpt:
      'The king, at the request of a subject, would need to inform local officers or assemblies of a right newly granted to that subject in order that the right could be enforced or upheld. For this task a longer form of document than...',
    featureArticle: 'Feature Article 7: John Reuben Davies',
  },
  {
    title:
      'The Standardisation of Diplomatic in Scottish Royal Acts down to 1249. Part 2: Letters with Notification',
    author: 'John Davies',
    date: '29 Feb 2016',
    comments: 0,
    excerpt:
      'The king, at the request of a subject, would need to inform local officers or assemblies of a right newly granted to that subject in order that the right could be enforced or upheld. For this task a longer form of document than...',
    featureArticle: 'Feature Article 7: John Reuben Davies',
  },
  {
    title:
      'The Standardisation of Diplomatic in Scottish Royal Acts down to 1249. Part 2: Letters with Notification',
    author: 'John Davies',
    date: '29 Feb 2016',
    comments: 0,
    excerpt:
      'The king, at the request of a subject, would need to inform local officers or assemblies of a right newly granted to that subject in order that the right could be enforced or upheld. For this task a longer form of document than...',
    featureArticle: 'Feature Article 7: John Reuben Davies',
  },
  {
    title:
      'The Standardisation of Diplomatic in Scottish Royal Acts down to 1249. Part 2: Letters with Notification',
    author: 'John Davies',
    date: '29 Feb 2016',
    comments: 0,
    excerpt:
      'The king, at the request of a subject, would need to inform local officers or assemblies of a right newly granted to that subject in order that the right could be enforced or upheld. For this task a longer form of document than...',
    featureArticle: 'Feature Article 7: John Reuben Davies',
  },
  // Add more articles as needed
]

const recentPosts = [
  'Models of Authority at the 59th International Congress on Medieval Studies at Kalamazoo',
  "Programme for 'The Book at the Bodleian'",
  "Alison Phipps, 'Languages and Permacultural Justice: Decoloniality and Multilingualism'",
  "'From Round Hand to l'Anglaise: 18th-c. English Handwriting and the Continent'",
  'The Book at the Bodleian: Whence? Where? Whither?',
]

const postsByTopic = [
  { name: 'About MOA', count: 4 },
  { name: 'Conferences', count: 3 },
  { name: 'DigiPal Project', count: 3 },
  { name: 'Palaeography', count: 5 },
  { name: 'Digital Dating', count: 1 },
  { name: 'Feature of the Month', count: 5 },
  { name: 'Training Opportunities', count: 2 },
  { name: 'Thinking Allowed', count: 1 },
]

const postsByAuthor = [
  { name: 'John Davies', count: 2 },
  { name: 'Peter Stokes', count: 13 },
  { name: 'Joanna Tucker', count: 2 },
  { name: 'Dauvit Broun', count: 3 },
  { name: 'Stewart Brookes', count: 28 },
  { name: 'Tessa Webber', count: 1 },
  { name: 'Alice Taylor', count: 2 },
]

export default function FeatureArticles() {
  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex flex-col md:flex-row gap-72'>
        <main className='flex-1'>
          <h1 className='text-3xl font-bold text-gray-800 mb-6'>
            Feature Article
          </h1>
          <div className='mb-4'>
            <button className='px-3 py-1 border border-gray-300 text-gray-600 mr-2'>
              &lt;
            </button>
            <button className='px-3 py-1 border border-gray-300 bg-gray-200 text-gray-800 mr-2'>
              1
            </button>
            <button className='px-3 py-1 border border-gray-300 text-gray-600 mr-2'>
              2
            </button>
            <button className='px-3 py-1 border border-gray-300 text-gray-600'>
              &gt;
            </button>
          </div>
          {articles.map((article, index) => (
            <article key={index} className='mb-8 pb-8 border-b border-gray-200'>
              <h2 className='text-2xl font-bold text-blue-600 mb-2 text-primary'>
                <Link href='#'>{article.title}</Link>
              </h2>
              <div className='text-sm text-gray-600 mb-2'>
                Posted by: {article.author} | {article.date} | Blog, Feature
                Article | {article.comments} Comments
              </div>
              <div className='bg-gray-100 p-2 mb-4'>
                {article.featureArticle}
              </div>
              <p className='mb-4'>{article.excerpt}</p>
              <Link href='#' className='text-blue-600 hover:underline'>
                Read more
              </Link>
            </article>
          ))}
          <div className='mt-4'>
            <button className='px-3 py-1 border border-gray-300 text-gray-600 mr-2'>
              &lt;
            </button>
            <button className='px-3 py-1 border border-gray-300 bg-gray-200 text-gray-800 mr-2'>
              1
            </button>
            <button className='px-3 py-1 border border-gray-300 text-gray-600 mr-2'>
              2
            </button>
            <button className='px-3 py-1 border border-gray-300 text-gray-600'>
              &gt;
            </button>
          </div>
        </main>
        <aside className='w-full md:w-96'>
          <section className='mb-8'>
            <h2 className='text-lg font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2'>
              Recent Posts
            </h2>
            <ul className='space-y-2'>
              {recentPosts.map((post, index) => (
                <li key={index}>
                  <Link
                    href='#'
                    className='text-blue-600 hover:underline text-sm'
                  >
                    {post}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section className='mb-8'>
            <h2 className='text-lg font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2'>
              Posts by Topic
            </h2>
            <ul className='space-y-1'>
              {postsByTopic.map((topic, index) => (
                <li key={index} className='text-sm'>
                  <Link href='#' className='text-blue-600 hover:underline'>
                    {topic.name}
                  </Link>{' '}
                  ({topic.count})
                </li>
              ))}
            </ul>
          </section>
          <section className='mb-8'>
            <h2 className='text-lg font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2'>
              Posts by Date
            </h2>
            <select className='w-full border border-gray-300 rounded px-2 py-1 text-sm'>
              <option>Select month</option>
            </select>
          </section>
          <section className='mb-8'>
            <h2 className='text-lg font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2'>
              Posts by Author
            </h2>
            <ul className='space-y-1'>
              {postsByAuthor.map((author, index) => (
                <li key={index} className='text-sm'>
                  <Link href='#' className='text-blue-600 hover:underline'>
                    {author.name}
                  </Link>{' '}
                  ({author.count})
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className='text-lg font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2'>
              Feeds
            </h2>
            <Link href='#' className='text-blue-600 hover:underline text-sm'>
              RSS / Atom
            </Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
