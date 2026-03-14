export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {children}
      </div>
    </div>
  )
}
