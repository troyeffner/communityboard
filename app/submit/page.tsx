import type { Metadata } from 'next'
import SubmitClient from './SubmitClient'

export const metadata: Metadata = {
  title: 'Submit – Community Board',
}

export default function SubmitPage() {
  return <SubmitClient />
}
