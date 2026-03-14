import { PageView } from "../_components/PageView"
import { InlinePrompt } from "../_components/InlinePrompt"
import { FalseDoorCTA } from "../_components/FalseDoorCTA"

const PATH = "/m/boards"

export default function BoardsStorefront() {
  return (
    <main className="space-y-10">
      <PageView path={PATH} />

      <header className="space-y-2">
        <div className="text-xs text-slate-500">Hypothesis Storefront</div>
        <h1 className="text-2xl font-semibold">Chronology is orientation</h1>
        <p className="text-slate-700 leading-relaxed">
          People want to reach the bottom. Completion creates calm.
          This is designed as a finite, time-based system — not an infinite scroll machine.
        </p>
      </header>

      <InlinePrompt
        path={PATH}
        promptId="finite_vs_infinite"
        title="What should the default experience be?"
        choices={[
          { id: "finite", label: "Finite list + you're caught up" },
          { id: "infinite", label: "Infinite feed" },
          { id: "digest", label: "Daily / weekly digest" },
          { id: "calendar", label: "Calendar-first" },
        ]}
      />

      <FalseDoorCTA
        path={PATH}
        ctaId="start_board_interest"
        label="Start a neighborhood board (false door)"
        detail="This would create a board for a venue, a street, or a town. Not live yet."
      />
    </main>
  )
}
