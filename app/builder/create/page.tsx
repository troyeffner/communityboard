import CreateClient from './CreateClient'

type SearchParams = {
  poster?: string
  poster_upload_id?: string
  manual?: string
}

export default function Page({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const params = searchParams
  const posterFromShort = typeof params?.poster === 'string' ? params.poster : null
  const posterFromUpload = typeof params?.poster_upload_id === 'string' ? params.poster_upload_id : null
  const initialPosterId = posterFromShort || posterFromUpload
  const initialManualMode = params?.manual === '1'

  return <CreateClient initialPosterId={initialPosterId} initialManualMode={initialManualMode} />
}
