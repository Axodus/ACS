# ACS Secret Storage Requirements

ACS must never store or expose raw API secrets in frontend code, browser storage, telemetry, receipts or plaintext logs.

Current phase:
- contract/interface only;
- mock adapter returns opaque `secretRef`;
- mock reads return a redacted placeholder;
- no plaintext persistence;
- no real CEX API connection.

Future production adapter requirements:
- use KMS, Vault or equivalent managed secret storage;
- encrypt at rest and in transit;
- enforce purpose-bound secret reads;
- record reads/revocations without secret values;
- support tenant and wallet scoping;
- support revocation and incident response;
- never send secret values to AxodusAPP.

Implementation:
- `src/secret-storage.ts`
