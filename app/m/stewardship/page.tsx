import { PageView } from "../_components/PageView"
import { InlinePrompt } from "../_components/InlinePrompt"
import { FalseDoorCTA } from "../_components/FalseDoorCTA"

const PATH = "/m/stewardship"

export default function StewardshipStorefront() {
  return (
    <main className="space-y-10">
      <PageView path={PATH} />

      <header className="space-y-2">
        <div className="text-xs text-slate-500">Hypothesis Storefront</div>
        <h1 className="text-2xl font-semibold">AI builds the platform. Community runs the program.</h1>
        <p className="text-slate-700 leading-relaxed">
          Automation scaffolds; community animates. Participation creates ownership.
          The value comes from people doing the work, not from perfect UI.
        </p>
      </header>

      <InlinePrompt
        path={PATH}
        promptId="steward_model"
        title="If this worked in your town, who should steward it?"
        choices={[
          { id: "library", label: "Library" },
          { id: "volunteers", label: "Volunteers" },
          { id: "town", label: "Town / city staff" },
          { id: "venue_network", label: "Network of venues" },
        ]}
      />

      <FalseDoorCTA
        path={PATH}
        ctaId="become_steward_interest"
        label="I would help steward this (false door)"
        detail="Clicking records interest. Later we can add a real pathway."
      />
    </main>
  )
}
