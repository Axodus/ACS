import type { ACSDecision, ACSDecisionCode } from "./trinity-acs-roundtrip-protocol.js";

export type TrinityTelegramResponseTemplateKind =
  | "research_allowed"
  | "artifact_pending"
  | "diff_proposal"
  | "sandbox_mutation_pending"
  | "artifact_created"
  | "blocked"
  | "human_review"
  | "default_deny";

export interface TrinityTelegramResponseContext {
  readonly decision: ACSDecision;
  readonly outputRef?: string;
  readonly evidenceRef?: string;
  readonly proofRef?: string;
  readonly rollbackRef?: string;
}

export interface TrinityTelegramResponseTemplate {
  readonly kind: TrinityTelegramResponseTemplateKind;
  readonly decision: ACSDecisionCode;
  readonly text: string;
  readonly communicatesBlockedActions: boolean;
  readonly exposesSensitiveDetails: false;
  readonly claimsUnauthorizedAction: false;
}

const SENSITIVE_PATTERNS: readonly RegExp[] = [
  /api[_-]?key/i,
  /api[_-]?secret/i,
  /private[_-]?key/i,
  /seed[_-]?phrase/i,
  /password/i,
  /token/i,
  /credential/i,
  /connector config/i,
  /conf\/connectors/i,
];

export function createTrinityTelegramResponseTemplate(
  context: TrinityTelegramResponseContext,
): TrinityTelegramResponseTemplate {
  const kind = inferTemplateKind(context);
  const text = sanitizeTelegramResponse(renderTemplate(kind, context));

  return {
    kind,
    decision: context.decision.decision,
    text,
    communicatesBlockedActions: text.includes("Bloqueado:"),
    exposesSensitiveDetails: false,
    claimsUnauthorizedAction: false,
  };
}

export function getTrinityTelegramResponseTemplateCatalog(): readonly {
  readonly kind: TrinityTelegramResponseTemplateKind;
  readonly purpose: string;
}[] {
  return [
    { kind: "research_allowed", purpose: "Report-only technical analysis allowed in Telegram." },
    { kind: "artifact_pending", purpose: "Artifact flow required before any file output." },
    { kind: "diff_proposal", purpose: "No-write diff proposal can be referenced with proof/evidence." },
    { kind: "sandbox_mutation_pending", purpose: "Sandbox create/edit/disable requires approval and ticket." },
    { kind: "artifact_created", purpose: "Artifact exists and can be referenced without claiming unauthorized execution." },
    { kind: "blocked", purpose: "Policy/freeze denial with safe blocked-action summary." },
    { kind: "human_review", purpose: "Human review required before any ticket or action." },
    { kind: "default_deny", purpose: "ACS missing/invalid response defaults to deny." },
  ];
}

function inferTemplateKind(context: TrinityTelegramResponseContext): TrinityTelegramResponseTemplateKind {
  if (context.outputRef && context.evidenceRef && context.decision.decision !== "allow_diff_only") {
    return "artifact_created";
  }

  switch (context.decision.decision) {
    case "allow_report_only":
      return "research_allowed";
    case "route_to_artifact_flow":
      return "artifact_pending";
    case "allow_diff_only":
      return "diff_proposal";
    case "pending_approval":
      return "sandbox_mutation_pending";
    case "requires_human_review":
      return "human_review";
    case "blocked_by_policy":
    case "blocked_by_freeze":
      return "blocked";
    case "deny":
      return "default_deny";
  }
}

function renderTemplate(kind: TrinityTelegramResponseTemplateKind, context: TrinityTelegramResponseContext): string {
  const decision = context.decision;
  const blocked = formatBlockedActions(decision.blockedActions);
  const output = context.outputRef ? `\nOutputRef: ${context.outputRef}.` : "";
  const evidence = context.evidenceRef ? `\nEvidenceRef: ${context.evidenceRef}.` : "";
  const proof = context.proofRef ? `\nProofRef: ${context.proofRef}.` : "";
  const rollback = context.rollbackRef ? `\nRollbackRef: ${context.rollbackRef}.` : "";
  const nextStep = decision.requiredNextStep ? `\nPróximo passo: ${decision.requiredNextStep}.` : "";

  switch (kind) {
    case "research_allowed":
      return [
        "ACS decision: allow_report_only.",
        "Posso responder com análise técnica aqui no Telegram.",
        "Nenhuma escrita de arquivo, execução, backtest ou operação Hummingbot foi autorizada.",
        `Modo permitido: ${decision.allowedModes.join(", ")}.`,
        `Bloqueado: ${blocked}.`,
        nextStep,
      ].join("\n");

    case "artifact_pending":
      return [
        "ACS decision: route_to_artifact_flow.",
        "O ACS exige artifact request com output allowlist, proof, rollback e evidence antes de qualquer arquivo.",
        "Nada foi salvo por Trinity neste canal.",
        `Modo permitido: ${decision.allowedModes.join(", ")}.`,
        `Bloqueado: ${blocked}.`,
        nextStep,
      ].join("\n");

    case "diff_proposal":
      return [
        "ACS decision: allow_diff_only.",
        "Posso preparar ou referenciar uma proposta de diff auditável.",
        "Nenhum patch foi aplicado e nenhum arquivo real Hummingbot foi editado.",
        `Modo permitido: ${decision.allowedModes.join(", ")}.`,
        `Bloqueado: ${blocked}.`,
        output,
        evidence,
        proof,
        rollback,
        nextStep,
      ].join("\n");

    case "sandbox_mutation_pending":
      return [
        "ACS decision: pending_approval.",
        "A alteração de estratégia Hummingbot exige approval, execution ticket, sandbox, proof e rollback.",
        "Nenhuma criação, edição, desativação ou remoção foi executada agora.",
        `Modo permitido: ${decision.allowedModes.join(", ")}.`,
        `Bloqueado: ${blocked}.`,
        nextStep,
      ].join("\n");

    case "artifact_created":
      return [
        `ACS decision: ${decision.decision}.`,
        "Artifact registrado pelo ACS.",
        "A resposta apenas referencia output/evidence aprovados; não implica execução ou runtime real.",
        `Modo permitido: ${decision.allowedModes.join(", ")}.`,
        `Bloqueado: ${blocked}.`,
        output,
        evidence,
        proof,
        rollback,
        nextStep,
      ].join("\n");

    case "blocked":
      return [
        `ACS decision: ${decision.decision}.`,
        "A solicitação foi bloqueada pela política ACS.",
        "Não posso executar, salvar, acessar runtime, acessar credenciais ou operar trading a partir do Telegram.",
        `Modo permitido: ${decision.allowedModes.length > 0 ? decision.allowedModes.join(", ") : "nenhum"}.`,
        `Bloqueado: ${blocked}.`,
        nextStep,
      ].join("\n");

    case "human_review":
      return [
        "ACS decision: requires_human_review.",
        "A solicitação exige revisão humana antes de qualquer ticket ou ação.",
        "Nenhuma mutação sandbox, backtest ou operação Hummingbot foi executada.",
        `Modo permitido: ${decision.allowedModes.join(", ")}.`,
        `Bloqueado: ${blocked}.`,
        nextStep,
      ].join("\n");

    case "default_deny":
      return [
        "ACS decision: deny.",
        "Sem decisão ACS válida, a resposta padrão é negar.",
        "Ausência de resposta ACS não é permissão.",
        `Modo permitido: ${decision.allowedModes.length > 0 ? decision.allowedModes.join(", ") : "nenhum"}.`,
        `Bloqueado: ${blocked}.`,
        nextStep,
      ].join("\n");
  }
}

function formatBlockedActions(actions: readonly string[]): string {
  if (actions.length === 0) {
    return "nenhuma ação adicional listada";
  }

  return actions
    .map((action) => action.replaceAll("_", " "))
    .join(", ");
}

function sanitizeTelegramResponse(text: string): string {
  return SENSITIVE_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, "[sensitive-ref]"),
    text,
  ).replace(/\n{3,}/g, "\n\n").trim();
}
