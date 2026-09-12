# Members Experience

Members are displayed by `slot_id`, not flattened into a unique Agent list. This preserves the fact that one Agent can occupy multiple Workforce slots.

For each slot the UI renders:

- Agent identity and a link to the existing Agent detail route;
- selector mode;
- pinned Agent revision when `mode = pinned`;
- explicit `current_head_at_admission` language when resolution happens only at Run admission;
- governed role revision reference when supplied;
- canonical responsibilities when supplied.

The page is read-only. Role references are not treated as editable inline labels.
