# ACS Trinity Telegram Response Contract

Sprint: 78 - Trinity Telegram Response Contract

Status: response contract only. No Telegram transport, bot execution, strategy mutation, Hummingbot runtime call, shell call, MCP call, network access, API key access, paper trade or live trade is enabled.

---

# Objective

Define how Trinity must respond to a requester after ACS processes an intent.

Trinity must communicate:

- ACS decision;
- allowed mode;
- blocked actions;
- next step;
- output/evidence/proof/rollback refs when ACS provides them.

Trinity must not claim actions that ACS did not authorize.

---

# Implemented Files

```text
src/trinity-telegram-response-contract.ts
src/fixtures/trinity-telegram-response-fixtures.ts
tests/trinity-telegram-response-contract.test.mjs
```

---

# Template Types

- `research_allowed`
- `artifact_pending`
- `diff_proposal`
- `sandbox_mutation_pending`
- `artifact_created`
- `blocked`
- `human_review`
- `default_deny`

---

# Research Allowed

```text
ACS decision: allow_report_only.
Posso responder com análise técnica aqui no Telegram.
Nenhuma escrita de arquivo, execução, backtest ou operação Hummingbot foi autorizada.
Modo permitido: report_only.
Bloqueado: ...
```

---

# Artifact Pending

```text
ACS decision: route_to_artifact_flow.
O ACS exige artifact request com output allowlist, proof, rollback e evidence antes de qualquer arquivo.
Nada foi salvo por Trinity neste canal.
Modo permitido: acs_artifact_flow.
Bloqueado: ...
```

---

# Strategy Mutation Pending

```text
ACS decision: pending_approval.
A alteração de estratégia Hummingbot exige approval, execution ticket, sandbox, proof e rollback.
Nenhuma criação, edição, desativação ou remoção foi executada agora.
Modo permitido: approval_required.
Bloqueado: ...
```

---

# Diff Proposal

```text
ACS decision: allow_diff_only.
Posso preparar ou referenciar uma proposta de diff auditável.
Nenhum patch foi aplicado e nenhum arquivo real Hummingbot foi editado.
OutputRef: ...
EvidenceRef: ...
ProofRef: ...
```

---

# Artifact Created

```text
ACS decision: pending_approval.
Artifact registrado pelo ACS.
A resposta apenas referencia output/evidence aprovados; não implica execução ou runtime real.
OutputRef: ...
EvidenceRef: ...
ProofRef: ...
RollbackRef: ...
```

---

# Blocked

```text
ACS decision: blocked_by_policy.
A solicitação foi bloqueada pela política ACS.
Não posso executar, salvar, acessar runtime, acessar credenciais ou operar trading a partir do Telegram.
Modo permitido: nenhum.
Bloqueado: ...
```

---

# Security Rules

- Do not expose secrets, API keys, API secrets, private keys, seed phrases, passwords, tokens or connector config bodies.
- Do not say "salvei", "executei", "apliquei patch", "rodei backtest", "iniciei bot" or similar unless ACS provided a valid artifact reference and the template states only that the artifact was registered.
- Do not imply Telegram is an execution channel.
- Always include blocked actions summary.
- Always include next step when ACS provides it.

---

# Acceptance Criteria

Delivered:

- Trinity has templates by ACS decision;
- no response suggests unauthorized action;
- requester can understand status, allowed mode, blocked actions and next step;
- output/evidence refs are included when present;
- sensitive details are sanitized.
