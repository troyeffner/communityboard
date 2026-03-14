import { PageView } from "../_components/PageView"
import { InlinePrompt } from "../_components/InlinePrompt"
import { FalseDoorCTA } from "../_components/FalseDoorCTA"

const PATH = "/m/posters"

export default function PostersStorefront() {
  return (
    <main className="space-y-10">
      <PageView path={PATH} />

      <header className="space-y-2">
        <div className="text-xs text-slate-500">Hypothesis Storefront</div>
        <h1 className="text-2xl font-semibold">Preserve texture</h1>
        <p className="text-slate-700 leading-relaxed">
          A photo of a physical poster contains social signal that structured data erases.
          This system starts with posters and translates them, instead of flattening them.
        </p>
      </header>

      <InlinePrompt
        path={PATH}
        promptId="poster_trust_signal"
        title="What makes you trust a local listing?"
        choices={[
          { id: "photo", label: "Photo of the real poster" },
          { id: "venue", label: "Venue name + address" },
          { id: "organizer", label: "Organizer info" },
          { id: "history", label: "Past events history" },
        ]}
      />

      <FalseDoorCTA
        path={PATH}
        ctaId="upload_poster_interest"
        label="Upload a poster photo (false door)"
        detail="If this button gets clicks, it tells me to prioritize a public submission flow."
      />
    </main>
  )
}
