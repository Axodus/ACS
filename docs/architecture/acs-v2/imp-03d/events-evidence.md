# Events and evidence

Compilation emits the minimal `execution.intent_compiled` native event and its outbox row in the same transaction as runtime admission. Existing Evidence records continue to reference the canonical runtime event and Attempt; no separate provenance store is introduced.
