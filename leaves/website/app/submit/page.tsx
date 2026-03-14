import type { Metadata } from 'next'
import SubmitClient from './SubmitClient'

export const metadata: Metadata = {
  title: 'Submit a poster photo',
}

export default function SubmitPage() {
  return <SubmitClient />
}
