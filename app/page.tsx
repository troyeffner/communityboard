export const dynamic = 'force-dynamic'

import { supabase } from '../src/lib/supabase'

function formatNY(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

export default async function Home() {
  const { data: events, error } = await supabase
    .from('events')
    .select('id,title,start_at,status')
    .order('start_at', { ascending: true })

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Utica Community Board</h1>
      <p style={{ opacity: 0.7 }}>All times shown in America/New_York.</p>

      {error && (
        <pre style={{ whiteSpace: "pre-wrap" }}>
          Error: {error.message}
        </pre>
      )}

      {!error && (!events || events.length === 0) && <p>No events yet.</p>}

      {!error && events && events.length > 0 && (
        <ul>
          {events.map((e) => (
            <li key={e.id}>
              <strong>{e.title}</strong> — {formatNY(e.start_at)}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
