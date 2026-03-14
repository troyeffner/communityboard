#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
cd "$REPO"

mkdir -p app/community

cat > app/community/page.tsx <<'TSX'
export default function CommunityMarketingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-20 space-y-20">

        {/* Hero */}
        <section className="space-y-6">
          <h1 className="text-4xl font-semibold tracking-tight">
            Community Board
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed">
            A hyper-local event system built for real places, not growth curves.
          </p>
          <p className="text-lg text-slate-700 leading-relaxed">
            When the cost of building collapsed, the center of value shifted from polish to framing.
            Communities can now design and govern their own digital infrastructure.
            That redistribution of design power is the real transformation underway.
          </p>
        </section>

        {/* Core Thesis */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Core Thesis</h2>
          <p className="text-slate-700 leading-relaxed">
            This project exists to test a simple idea:
          </p>
          <p className="text-slate-700 leading-relaxed">
            Small communities can build and run their own digital infrastructure.
            It does not need to scale to millions to matter.
            It needs to work for thousands.
          </p>
        </section>

        {/* Principles */}
        <section className="space-y-12">

          {[
            {
              title: "Build for Thousands, Not Millions",
              body: "Improving the lives of thousands of people in a place you actually live creates visible, accountable change. When users are your neighbors, design becomes relational rather than abstract."
            },
            {
              title: "Big Tech Builds for Profit. Communities Build for Solutions.",
              body: "Large platforms optimize for engagement and monetization. Communities optimize for fit and usefulness. Local tools don’t need mass adoption to be valuable."
            },
            {
              title: "AI Builds the Platform. Community Runs the Program.",
              body: "AI lowers the barrier to infrastructure. But participation, stewardship, and trust remain human responsibilities."
            },
            {
              title: "Start with Anchor 0: Framing",
              body: "Before choosing UI, choose metaphor. Systems encode stories about power, collaboration, and purpose."
            },
            {
              title: "Dead Ends Are Not Failures",
              body: "‘No events tonight’ is honest civic information. Artificial abundance erodes trust."
            },
            {
              title: "Chronology Is Orientation",
              body: "Finite systems create closure. Completion creates calm. Limits support psychological safety."
            },
            {
              title: "Delight Is Relief",
              body: "Solving confusion creates emotional resonance. Function builds trust."
            },
            {
              title: "Preserve Texture",
              body: "Physical posters carry social signal. Context is part of meaning. Translation is better than extraction."
            },
            {
              title: "Ownership Changes Power",
              body: "When communities own servers, code, and governance, incentives shift. Accountability becomes social, not corporate."
            },
            {
              title: "Design Is Governance",
              body: "Software encodes rules of behavior. Permission models reflect power dynamics."
            },
            {
              title: "Restraint Is a Design Choice",
              body: "Not everything should be automated. Some friction preserves meaning."
            },
            {
              title: "The Shift",
              body: "UI glamour is cheap. Framing, alignment, and problem definition are scarce. Human-scale infrastructure is the new frontier."
            }
          ].map((item, i) => (
            <div key={i} className="space-y-3">
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <p className="text-slate-700 leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}

        </section>

        {/* Closing */}
        <section className="pt-10 border-t border-slate-200">
          <p className="text-lg text-slate-700 leading-relaxed">
            This is an experiment in civic software.
            It is not trying to win the internet.
            It is trying to serve a place.
          </p>
        </section>

      </div>
    </main>
  )
}
TSX

echo ""
echo "Created: app/community/page.tsx"
echo "Run: npm run dev"
echo "Visit: http://localhost:3000/community"
