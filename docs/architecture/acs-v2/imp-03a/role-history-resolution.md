# Governed role history resolution

REQ-06 requires a Workforce revision to retain the exact governed role
resource revision it referenced. IMP-03A adds `GovernedRoleRevisionV2` as a
durable ACS-owned history record for the existing governed role resource; it
does not create a new Workforce role authority or change governance policy.

Role records use the existing revision-reference shape with `entity_kind:
resource`, explicit role id, revision, and content fingerprint. A role history
write requires the expected role head and records an immutable successor.
Workforce validation reads the exact `(role_id, revision, fingerprint)` and
checks the current head only for eligibility of a new Workforce revision.
Historical reconstruction reads the exact stored version, so later role
changes cannot rewrite the meaning of an earlier Workforce revision.

The acceptance sequence is covered by the focused PostgreSQL test:

1. role X v1 is recorded;
2. Workforce revision r1 references X v1;
3. role X v2 is recorded;
4. Workforce revision r2 references X v2;
5. reload resolves r1 to v1 and r2 to v2.

Deprecated role versions remain readable for history but are rejected for new
Workforce membership when the exact reference or current role head is not
eligible.
