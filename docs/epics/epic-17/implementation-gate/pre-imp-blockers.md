# EPIC-17 Pre-IMP Blockers

## `E17-R12-B01` — Concrete IMP-01 charter absent

**Classification:** `BLOCKS FIRST IMPLEMENTATION`
**Current state:** `READY FOR CTO DISPOSITION`

### Cause

REQ-12 accepted only a dependency-ordered candidate sequence. It did not select
the exact REQ-01/REQ-02 contract deltas and ADRs, migration mode, touched
surfaces, validation commands, rollback behavior or IMP-01 acceptance criteria.
Starting code from the broad candidate row would permit scope drift.

### Required resolution

The CTO must accept or amend the [IMP-01 charter](imp-01-charter.md). Acceptance
must explicitly preserve:

- one Native Agent mutation authority;
- no dual write or destructive legacy conversion;
- one source-faithful Product API projection;
- Agent-owned, reconstructable head/lifecycle history;
- Profile as presentation and Persona as Agent-revision semantics;
- exact disposition of the 14 candidate deltas, 6 ADR candidates and 11
  inherited blockers mapped to `E17-R12-C01`;
- no implementation beyond the named source, migration, test and rollback
  boundaries.

### Closure evidence

An explicit CTO `GO` for the exact charter closes `E17-R12-B01`. Preparing or
committing this documentation does not close it.

## `E17-R12-B02` — `ACS-BLOCKER-014` status conflict

**Classification:** `PRE-IMP BLOCKER RECONCILED`
**Current state:** `RESOLVED / CTO ACCEPTED`

### Cause

The canonical [.instructions blocker register](../../../../.instructions/BLOCKER_REGISTER.md)
contains stale `HIGH / OPEN` metadata based on an older baseline. The later
[remediation decision record](../../../architecture/acs-v2/blockers/acs-blocker-014/README.md)
and its [evidence](../../../architecture/acs-v2/blockers/acs-blocker-014/remediation-evidence.md)
are accepted for this gate and record:

```text
isolated full suite: 692 total / 688 passed / 0 failed / 4 PostgreSQL skips
integrated target run: 6 passed / 0 failed / 0 skipped
PostgreSQL revalidation: 3 + 3 + 1 passed / 0 failed
```

The four full-suite skips remain skips. The separate PostgreSQL runs supply the
database evidence, but only the governing authority can reconcile the register.

### Required resolution

The CTO gate must choose one outcome:

1. **Accept remediation evidence.** Update the canonical blocker register to
   `RESOLVED` with the exact split between full-suite and PostgreSQL evidence,
   then record that baseline in the IMP-01 GO.
2. **Keep the blocker open.** Name the missing command or evidence. IMP-01 stays
   `BLOCKED` until that remediation passes and the register is updated.

No code may begin while the status sources disagree. EPIC-17 cannot silently
close, reopen or relabel this ACS-wide blocker.

## Combined gate

```text
B01 accepted charter
AND
B02 reconciled validation baseline
  -> IMP-01 may receive GO

otherwise
  -> IMP-01 BLOCKED
```
