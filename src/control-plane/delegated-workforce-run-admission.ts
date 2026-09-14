import type { WorkforceRunAdmissionRequest, WorkforceRunAdmissionResult } from "../native-core/workforce-run-membership.js";
import type { DelegationGrantRevisionRefV1 } from "../native-core/delegation.js";
import { freezeNative } from "../native-core/primitives.js";
import { DurableDelegationAuthorityResolverV1 } from "./delegation-authority-resolver.js";
import type { AsyncNativeCoreRepository } from "./shared-state/native-core-durable.js";

export class DelegatedAuthorityAdmissionError extends Error {
  readonly code = "ACS_DELEGATED_AUTHORITY_ADMISSION_REJECTED";
  constructor(readonly runId: string, options?: ErrorOptions) {
    super(`delegated authority admission rejected for ${runId}`, options);
    this.name = "DelegatedAuthorityAdmissionError";
  }
}

/** Admission adapter: Delegation supplies authority evidence; the native admission owner still creates the Run. */
export class DelegatedWorkforceRunAdmissionServiceV1 {
  constructor(private readonly nativeCore: AsyncNativeCoreRepository, private readonly resolver: DurableDelegationAuthorityResolverV1) {}

  async admit(input: WorkforceRunAdmissionRequest & { readonly delegation_grant_ref: DelegationGrantRevisionRefV1 }): Promise<WorkforceRunAdmissionResult> {
    const resolved = await this.resolver.resolve({ grant_ref: input.delegation_grant_ref, at: input.admitted_at }).catch((error: unknown) => {
      throw new DelegatedAuthorityAdmissionError(input.run.run_id, { cause: error });
    });
    const snapshot = freezeNative(JSON.parse(JSON.stringify({
      authority_basis_ref: resolved.authority_basis.revision.ref,
      chain_refs: resolved.chain.map((use) => use.revision.ref),
      effective_authority_bounds: resolved.effective_authority.authority_bounds,
      governing_authority_refs: resolved.effective_authority.governing_authority_refs,
      governing_policy_refs: resolved.effective_authority.governing_policy_refs,
      admitted_at: input.admitted_at,
    })));
    const { delegation_grant_ref: _grantRef, ...request } = input;
    return this.nativeCore.admitWorkforceRun({ ...request, delegated_authority_snapshot: snapshot });
  }
}
