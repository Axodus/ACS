# Events and provenance

Admission emits `workforce.run.admitted` on the Run stream and enqueues the existing canonical retryable outbox record. The event records the Workforce revision fingerprint, snapshot identity, and member count. Snapshot members preserve slot, Agent revision, role revision, resolution mode, and resolution timestamp.
