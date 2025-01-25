import Link from 'next/link'

export default function HistoricalContext() {
  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex flex-col md:flex-row gap-8'>
        <main className='flex-1'>
          <h1 className='text-3xl font-bold mb-6'>Historical Context</h1>

          <section className='mb-8'>
            <p className='mb-4'>
              Government as we recognise it today, a form of public authority
              functioning continuously and impersonally, first emerged in
              Western Europe in the twelfth century. One of the cardinal points
              on which our understanding of this development turns is the
              evidence of charters: and it is from the twelfth century onwards
              that charters begin to survive in large numbers. This project
              focuses on analysing the most distinctive features of charters:
              the appearance of their handwriting, and the formulaic aspects of
              their prose as a way to reach a new perspective on the origins of
              government in its modern western European form.
            </p>
          </section>

          <section className='mb-8'>
            <h2 className='text-2xl font-bold mb-4'>
              Royal charters as a new &apos;model of authority&apos;
            </h2>
            <p className='mb-4'>
              Charters are generally recognised as artefacts of authority: as
              such, the way in which they were composed and written out must be
              significant for understanding the authority they represent. During
              the first half of the twelfth century English royal scribes wrote
              in an increasingly rapid manner, introducing simplified forms and
              cursive elements into their handwriting. During the second half of
              the century and into the thirteenth, they sometimes combined these
              more rapid traces with various stylistic elements for visual
              effect, a process that ultimately culminated in the emergence of a
              new cursive script. Scottish royal scribes were not far behind in
              imitating their English counterparts. Non-royal scribes in
              Scotland as well as England sometimes also followed suit.
            </p>
            <p className='mb-4'>
              The conventional view is that the increasing use of more
              rapidly-traced handwriting and the development of cursive script
              can be put down to pressure of business. But was this the only
              factor? In Scotland there are examples of hurried writing in
              contexts where there is no evidence for pressure of business. An
              alternative explanation would be that there was a conscious
              attempt to mimic the appearance of royal documents, perhaps
              perceiving them as models of authority: Scottish royal scribes
              imitated English practice, and then other scribes in Scotland
              imitated the handwriting of Scottish or English royal documents.
              The same pattern of influence can be found not just in the
              handwriting of Scottish charters, but in their prose too. By the
              early thirteenth century in Britain, a more regularised form of
              prose was being used, with stock phrases and standardised formulae
              accompanying the newly emergent cursive script. Yet this emergence
              of regularised prose and cursive script has not been studied from
              the perspective of charters as artefacts of authority modelled
              increasingly on royal exemplars. All this makes the handwriting
              and prose of charters a significant untapped resource for tracking
              the increasing profile of kingship as a source of social authority
              in relation to the growth of government, particularly in relation
              to property and privileges.
            </p>
          </section>

          <section className='mb-8'>
            <h2 className='text-2xl font-bold mb-4'>
              Royal charters and other &apos;models of authority&apos;
            </h2>
            <p className='mb-4'>
              In this project we plan to track how scribes imitated one another
              in the incremental process of stylistic change. Royal charters
              were not the only model available to them: there were also two
              more formal varieties of handwriting, one little different from
              the formal bookhand, modified only by the inclusion of a few
              variant letter-forms, and found most commonly in twelfth-century
              monastic charters, the other the more stylistically elaborate
              handwriting of the papal chancery, sometimes mediated through
              episcopal charters. Both were influential on Scottish royal
              charters. We ask to what extent kingship itself evolved as a model
              of authority for the way in which non-royal scribes expressed
              their own property and privileges. This project, by identifying
              the influence on non-royal charters of practices observed in royal
              charters, will show how far and when the charter styles of a
              developing royal bureaucracy permeated the written conceptions of
              authority of other institutions and individuals in relation to
              property and privileges. It will also show the effect of other
              forms of authority – papal and monastic – on the styles of written
              kingship itself.
            </p>
          </section>

          <section className='mb-8'>
            <h2 className='text-2xl font-bold mb-4'>Research question:</h2>
            <p className='mb-4'>
              This new context for examining the emergence of government is
              encapsulated in the project&apos;s core question: how does
              kingship as a model of authority in the writing of Scottish
              charters relate to the emergence of government?
            </p>
            <p className='mb-4'>
              The answers to this question would be revealed by mapping those
              features that have their origin in royal documents against aspects
              of handwriting and prose that represent other models of authority
              in charter- writing during this period. In this way one can be
              sensitive to the evidence for whether a particular scribe was
              working for the donor, the beneficiary, or the king. This
              comparison should then show us at which points in time and in what
              situations royal authority was taken as a model of authority by
              those who produced charters.
            </p>
            <p className='mb-4'>
              The results will form a new framework of questions for thinking
              about the emergence of government. To what extent did a desire for
              order initially look as much towards ecclesiastical authority as
              towards kingship? For how long and in what situations did a
              distinctive modified bookhand and innovative prose – with neither
              having clear reference to royal or papal practice – most strongly
              persist? In what types of document was the standardisation of the
              prose and the emergence of cursive elements in the handwriting
              most apparent, and how did this relate to procedural changes in
              the adjudication of property rights? Which came first: greater
              royal power and bureaucratisation, or a growing espousal of royal
              authority by those with property and privileges? Were royal models
              influential in particular situations?
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold mb-4'>Why Scotland?</h2>
            <p className='mb-4'>
              Scotland is best placed to be the case-study for four main
              reasons. First, a collection of 691 digital images of charters has
              been assembled from a range of medieval archives – an unparalleled
              resource for a kingdom in this period. Second, the essential task
              of dating the text of each charter has recently been completed in
              the &apos;People of Medieval Scotland&apos; database (launched on
              5 September 2012); see www.poms.ac.uk. Third, Scotland&apos;s
              institutional development in this period has recently been
              reappraised in Alice Taylor&apos;s monograph The Shape of the
              State in Medieval Scotland, 1124–1290 (due to be published by OUP
              later this year or early in 2016). Finally, the corpus of charters
              is small enough to be manageable but large enough for the results
              of the analysis of their handwriting and prose to be significant,
              embracing an entire kingdom.
            </p>
          </section>
        </main>

        <aside className='w-full md:w-64'>
          <nav className='bg-gray-100 p-4 rounded-lg'>
            <h2 className='text-xl font-bold mb-4'>About</h2>
            <ul className='space-y-2'>
              <li>
                <Link
                  href='/historical-context'
                  className='text-blue-600 hover:underline'
                >
                  Historical Context
                </Link>
              </li>
              <li>
                <Link
                  href='/project-team'
                  className='text-blue-600 hover:underline'
                >
                  Project Team
                </Link>
              </li>
              <li>
                <Link
                  href='/citing-database'
                  className='text-blue-600 hover:underline'
                >
                  Citing the Models of Authority database
                </Link>
              </li>
              <li>
                <Link
                  href='/talks-publications'
                  className='text-blue-600 hover:underline'
                >
                  Talks and Publications
                </Link>
              </li>
              <li>
                <Link
                  href='/acknowledgements'
                  className='text-blue-600 hover:underline'
                >
                  Acknowledgements and Image Rights
                </Link>
              </li>
              <li>
                <Link
                  href='/privacy-policy'
                  className='text-blue-600 hover:underline'
                >
                  Privacy and Cookie Policy
                </Link>
              </li>
              <li>
                <Link
                  href='/accessibility'
                  className='text-blue-600 hover:underline'
                >
                  Accessibility Statement
                </Link>
              </li>
              <li>
                <Link href='/search' className='text-blue-600 hover:underline'>
                  Search
                </Link>
              </li>
              <li>
                <Link href='/about' className='text-blue-600 hover:underline'>
                  About
                </Link>
              </li>
            </ul>
          </nav>
        </aside>
      </div>
    </div>
  )
}
