# Builder Workflow Spec + Regression Checklist

## Selection + form state behavior spec
- Form edits are durable while placing pins: clicking the poster to place/update a new-item pin must not clear any typed fields.
- Creating a new pinned item requires a pin (`Add item` disabled until a pin exists), but typed fields remain intact.
- Switching context with unsaved form changes prompts confirmation before discard:
  - switching posters
  - switching from one selected item to another
  - switching from editing an existing item to a new pin flow
- If discard is confirmed, the target context loads as expected:
  - poster switch resets to a clean new-item form
  - item switch loads selected item values
  - new pin flow exits edit mode and keeps current typed values
- Saving an edited item updates baseline state (no immediate dirty prompt after save).
- Saving a new pinned item keeps typed field values for rapid repeat entry and clears only the active pin.
- Items for the active poster live in Inspector (`Item` view), and selecting an item from list or pin keeps selection parity.
- Poster delete is explicit and safe:
  - zero linked items: confirm prompt before delete
  - linked items: modal requires explicit mode (unlink only vs delete with events) before delete

## Builder-only smoke checklist
- `/builder/create`: select poster, type title/location/description, click image to place pin, verify typed values remain.
- `/builder/create`: while editing an existing item, change fields, click another item pin, verify unsaved-discard prompt appears.
- `/builder/create`: while editing an existing item, change fields, click poster image for new pin, verify unsaved-discard prompt appears.
- `/builder/create`: cancel unsaved-discard prompt, verify current edit state and values remain unchanged.
- `/builder/create`: confirm unsaved-discard prompt, verify new target context is applied correctly.
- `/builder/create`: attempt add without pin, verify add is blocked and typed values remain.
- `/builder/create`: add item with pin, verify success message, pin clears, typed values persist for next add.
- `/builder/create`: `Items on this poster` list remains in Inspector and selecting list rows highlights corresponding pin.
- `/builder/create`: delete poster with linked items opens mode modal and requires explicit confirmation.
- `/builder/create`: run `Next untended poster` and `Mark Done`; verify navigation/queue behavior still works.
- `/builder/tend` (mobile width): no unintended page-level horizontal overflow; filters and actions remain tappable.
- `/builder/tend`: table remains usable via contained horizontal scroll on narrow screens.
