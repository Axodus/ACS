# 06 — Security, privacy, sovereignty, and lock-in

## Trust-boundary inventory

A future System One adapter could cross these ACS boundaries:

1. Product/request context to judgment request.
2. Tenant/Organization and domain scope to provider context.
3. Canonical Evidence references or redacted excerpts to provider input.
4. ACS policy version and question definition to provider execution.
5. Provider result and metadata back to ACS telemetry/evidence ingestion.
6. Provider credential/configuration storage and operational logs.

The current ACS security posture prohibits crossing these boundaries with real
credentials, production data, or production provider calls in this request.

## Data and privacy findings

The official legal materials provide source evidence, but not automatic ACS
approval:

- **VENDOR CONTRACTUAL TERM:** the privacy policy states that TypeSafe will not
  train or fine-tune AI/ML models on prompts or other Input;
- **VENDOR CONTRACTUAL TERM:** the DPA describes TypeSafe as a processor for
  Customer Personal Data, permits listed subprocessors, and describes transfer
  mechanisms;
- **VENDOR CONTRACTUAL TERM:** the privacy policy says the Services are hosted
  in the United States;
- **VENDOR CONTRACTUAL TERM:** the Master Customer Agreement permits processing
  of Telemetry to improve TypeSafe services and says TypeSafe has no obligation
  to retain Customer Data after termination, with a backup caveat.

These terms reduce some uncertainty, but ACS still needs a plan/edition-specific
review, legal review, deletion/export verification, subprocessor review, and a
decision about whether any ACS data may leave its boundary.

The minimum future data-flow posture should be:

- send the least context needed to answer the bounded question;
- prefer Evidence IDs, hashes, redacted excerpts, or synthetic fixtures over
  raw prompts, secrets, credentials, or unrelated tenant data;
- preserve tenant/domain classification and retention instructions;
- prohibit provider results from becoming a second canonical data store;
- redact sensitive values from logs, telemetry, receipts, and error messages;
- record provider/model/version and data-classification metadata.

The following remain **UNKNOWN** or require validation before provider use:

- operational enforcement of retention and deletion, including backups;
- whether the contractual no-training term covers every selected service mode,
  telemetry path, and subprocessor;
- region controls beyond the published U.S. hosting statement;
- tenant isolation and cross-tenant incident behavior;
- credential storage and rotation model;
- export/delete/audit APIs;
- breach notification and incident evidence;
- prompt-injection and malicious-context handling;
- confidence manipulation, answer-space abuse, and adversarial inputs.

The existence of official documentation, an SDK, or legal terms does not
establish that the selected ACS deployment has been reviewed, configured, or
tested for these properties.

## Failure isolation

The adapter must isolate provider failure from ACS control-plane safety:

- provider unavailable -> explicit unavailable state;
- malformed result -> adapter rejection and observable failure;
- confidence missing or invalid -> policy-defined uncertainty;
- stale version -> compatibility failure or re-evaluation;
- provider compromise -> bounded context, no authority, no secret access;
- data leakage -> incident path and evidence preservation;
- provider removal -> ACS canonical records remain intact.

## Lock-in assessment

| Lock-in type | Risk | Required countermeasure |
| --- | --- | --- |
| Vendor/API | Medium | Adapter boundary, version pinning, contract tests, export path. |
| Schema | Medium | ACS-owned translation and portable result envelope. |
| Semantics | High | ACS owns question meaning, answer interpretation, thresholds, and policy. |
| Model/version | High | Record exact provider/model/version and validate drift. |
| Confidence scale | High | Treat confidence as provider-reported evidence, not universal truth; calibrate per task. |
| Proprietary judgment semantics | Medium/High | Preserve question definitions and portable labels outside provider. |
| Critical-path dependency | High | Async or fallback path; circuit breaker; no provider-only admission. |
| Reproducibility | High | Store input references, policy/question revisions, provider metadata, and result state. |

## Sovereignty conclusion

System One can be considered only as a replaceable provider. It fails the ACS
sovereignty requirement if removing it loses canonical identity, workflow,
governance references, Evidence lineage, or the ability to route future work to
another provider.
