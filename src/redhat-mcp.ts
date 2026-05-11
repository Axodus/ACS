import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { DefaultExecutionPolicy, type CommandPolicyDecision, type CommandRiskAssessment, type ExecutionPolicy } from "./execution-policy.js";
import type { TelemetrySink } from "./telemetry.js";

export interface RedHatMcpAdapterOptions {
  readonly redHatRoot: string;
  readonly telemetry?: TelemetrySink;
  readonly executionPolicy?: ExecutionPolicy;
}

export interface RedHatSkillSummary {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly path: string;
}

export interface RedHatSkillDescription extends RedHatSkillSummary {
  readonly body: string;
}

export interface RedHatPlanTaskInput {
  readonly task: string;
  readonly preferredSkillIds?: readonly string[];
}

export interface RedHatTaskPlan {
  readonly task: string;
  readonly adapter: "redhat-mcp-safe-local";
  readonly executionAllowed: false;
  readonly recommendedSkills: readonly RedHatSkillSummary[];
  readonly steps: readonly string[];
  readonly boundary: string;
}

export type RedHatGuardedTaskStatus = "blocked";

export interface RedHatExecuteGuardedTaskInput {
  readonly task: string;
  readonly requestedAction?: string;
  readonly preferredSkillIds?: readonly string[];
  readonly approvalToken?: string;
  readonly dryRun?: boolean;
}

export interface RedHatGuardedTaskResult {
  readonly task: string;
  readonly requestedAction: string;
  readonly status: RedHatGuardedTaskStatus;
  readonly executionAllowed: false;
  readonly dryRun: true;
  readonly risk: CommandRiskAssessment;
  readonly allowlistMatched: boolean;
  readonly policy: CommandPolicyDecision;
  readonly plan: RedHatTaskPlan;
  readonly telemetryId?: string;
  readonly boundary: string;
}

export class RedHatMcpAdapter {
  readonly #skillsRoot: string;
  readonly #telemetry: TelemetrySink | undefined;
  readonly #executionPolicy: ExecutionPolicy;

  constructor(options: RedHatMcpAdapterOptions) {
    this.#skillsRoot = join(options.redHatRoot, "skills");
    this.#telemetry = options.telemetry;
    this.#executionPolicy = options.executionPolicy ?? new DefaultExecutionPolicy();
  }

  listSkills(): readonly RedHatSkillSummary[] {
    if (!existsSync(this.#skillsRoot)) {
      return [];
    }

    return readdirSync(this.#skillsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => this.#readSkillSummary(entry.name))
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  describeSkill(skillId: string): RedHatSkillDescription {
    const summary = this.#readSkillSummary(skillId);
    const skillPath = join(this.#skillsRoot, skillId, "SKILL.md");

    if (!existsSync(skillPath)) {
      throw new Error(`RedHat skill not found: ${skillId}`);
    }

    return {
      ...summary,
      body: readFileSync(skillPath, "utf8"),
    };
  }

  planTask(input: RedHatPlanTaskInput): RedHatTaskPlan {
    const skills = this.#selectSkills(input);

    return {
      task: input.task,
      adapter: "redhat-mcp-safe-local",
      executionAllowed: false,
      recommendedSkills: skills,
      steps: [
        "Parse task intent and risk level.",
        "Select bounded RedHat Dev skills for planning only.",
        "Produce an implementation plan with validation requirements.",
        "Require an explicit future execution adapter before running commands or mutating files through MCP.",
      ],
      boundary: "This adapter only reads RedHat Dev skill metadata and plans work. It does not execute commands, mutate files, call MCP tools, or run OpenClaw agents.",
    };
  }

  executeGuardedTask(input: RedHatExecuteGuardedTaskInput): RedHatGuardedTaskResult {
    const requestedAction = input.requestedAction ?? "redhat.executeGuardedTask";
    const policy = this.#executionPolicy.evaluate({
      task: input.task,
      requestedAction,
      ...(input.approvalToken ? { approvalToken: input.approvalToken } : {}),
    });
    const plan = this.planTask({
      task: input.task,
      ...(input.preferredSkillIds ? { preferredSkillIds: input.preferredSkillIds } : {}),
    });

    const event = this.#telemetry?.record("redhat.task.blocked", requestedAction, {
      task: input.task,
      requestedAction,
      riskLevel: policy.risk.level,
      riskReasons: policy.risk.reasons,
      allowlistMatched: policy.allowlistMatched,
      approvalState: policy.approvalState,
      policyReasons: policy.reasons,
      sandbox: policy.sandbox,
      dryRun: true,
      reason: "guarded execution is blocked by execution policy",
    });

    return {
      task: input.task,
      requestedAction,
      status: "blocked",
      executionAllowed: false,
      dryRun: true,
      risk: policy.risk,
      allowlistMatched: policy.allowlistMatched,
      policy,
      plan,
      ...(event ? { telemetryId: event.id } : {}),
      boundary: "executeGuardedTask is currently a contract and risk gate only. It never executes commands, mutates files, calls MCP tools, or runs OpenClaw agents.",
    };
  }

  #selectSkills(input: RedHatPlanTaskInput): readonly RedHatSkillSummary[] {
    const skills = this.listSkills();
    if (input.preferredSkillIds && input.preferredSkillIds.length > 0) {
      const preferred = new Set(input.preferredSkillIds);
      return skills.filter((skill) => preferred.has(skill.id));
    }

    const task = input.task.toLowerCase();
    const scored = skills.map((skill) => ({
      skill,
      score: scoreSkill(skill, task),
    }));

    return scored
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || left.skill.id.localeCompare(right.skill.id))
      .slice(0, 5)
      .map((entry) => entry.skill);
  }

  #readSkillSummary(skillId: string): RedHatSkillSummary {
    const skillPath = join(this.#skillsRoot, skillId, "SKILL.md");
    const body = existsSync(skillPath) ? readFileSync(skillPath, "utf8") : "";
    const frontmatter = parseFrontmatter(body);

    return {
      id: skillId,
      name: frontmatter.name ?? skillId,
      ...(frontmatter.description ? { description: frontmatter.description } : {}),
      path: skillPath,
    };
  }
}

function scoreSkill(skill: RedHatSkillSummary, task: string): number {
  const haystack = `${skill.id} ${skill.name} ${skill.description ?? ""}`.toLowerCase();
  const tokens = task.split(/[^a-z0-9-]+/).filter((token) => token.length >= 3);

  return tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

function parseFrontmatter(body: string): Record<string, string> {
  if (!body.startsWith("---")) {
    return {};
  }

  const end = body.indexOf("\n---", 3);
  if (end === -1) {
    return {};
  }

  const entries = body
    .slice(3, end)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes(":"))
    .map((line) => {
      const separator = line.indexOf(":");
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^["']|["']$/g, "")] as const;
    });

  return Object.fromEntries(entries.map(([key, value]) => [basename(key), value]));
}
