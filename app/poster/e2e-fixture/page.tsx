import type { Metadata } from 'next'
import PosterViewer from '@/app/poster/[id]/PosterViewer'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Found at: E2E Community Board',
}

export default function Page() {
  return (
    <main className="cb-page-container cbPosterPage" style={{ scrollBehavior: 'smooth' }}>
      <PosterViewer
        imageUrls={[
          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="100%" height="100%" fill="%23eef2ff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="56" fill="%23334155">E2E Poster Fixture</text></svg>',
        ]}
        pins={[
          {
            link_id: 'e2e-link-1',
            event_id: 'e2e-event-1',
            title: 'Neighborhood Cleanup',
            start_at: '2026-03-07T14:00:00',
            location: 'Main Street Plaza',
            status: 'published',
            item_type: 'event',
            upvote_count: 3,
            did_upvote: false,
            bbox: { x: 0.24, y: 0.31 },
          },
          {
            link_id: 'e2e-link-2',
            event_id: 'e2e-event-2',
            title: 'Open Studio Night',
            start_at: '2026-03-08T18:30:00',
            location: 'Cedar Arts',
            status: 'published',
            item_type: 'event',
            upvote_count: 6,
            did_upvote: false,
            bbox: { x: 0.71, y: 0.58 },
          },
        ]}
        activeEventId={null}
        photoTakenAt="2026-02-27T14:00:00.000Z"
        seenAt="E2E Community Board"
        seenAtHref="/browse?seenAt=E2E%20Community%20Board"
      />
    </main>
  )
}
