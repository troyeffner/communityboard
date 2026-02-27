import BrowseClient from './BrowseClient'

type SearchParams = {
  poster?: string
  seenAt?: string
  tags?: string
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  return (
    <BrowseClient
      initialPoster={typeof params.poster === 'string' ? params.poster : ''}
      initialSeenAt={typeof params.seenAt === 'string' ? params.seenAt : ''}
      initialTags={typeof params.tags === 'string' ? params.tags : ''}
    />
  )
}
