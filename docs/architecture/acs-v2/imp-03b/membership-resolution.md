# Membership resolution

Pinned selectors match Agent revision number and fingerprint exactly. `current_head_at_admission` selects the Agent lineage head observed inside the admission transaction. The resulting snapshot contains only exact Agent revision references; the unresolved selector never enters effective Run membership.

Each Workforce slot produces one snapshot member. Slot identity is retained, so the same Agent can occupy distinguishable slots. Role references retain the exact governed role revision from the admitted Workforce revision.
