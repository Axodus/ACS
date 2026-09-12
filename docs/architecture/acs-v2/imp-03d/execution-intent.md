# Execution intent

`RuntimeExecutionIntentV2` is the immutable compiled identity. It records Run, Task, assignment and generation, member slot, Agent identity and revision, Workforce revision, accepted runtime configuration, compilation time, and provenance.

The intent is created from canonical records and remains tied to its original assignment after reassignment or head advancement. Current Agent and Workforce heads are not used for historical execution.
