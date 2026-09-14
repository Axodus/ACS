import {
  assertDelegationGrantAttenuatesSourceV1,
  selectDelegationAuthorityBasisV1,
  validateDelegationAdmissionChainV1,
  DelegationResolutionError,
  type DelegationAuthorityResolverV1,
  type DelegationAuthoritySourceV1,
  type DelegationGrantAdmissionUseV1,
  type DelegationGrantRevisionV1,
  type DelegationGrantRevisionRefV1,
} from "../native-core/delegation.js";
import type { AsyncNativeCoreRepository, NativeDelegationGrantLineage } from "./shared-state/native-core-durable.js";

export interface EffectiveDelegatedAuthorityV1 {
  readonly authority_basis: DelegationGrantAdmissionUseV1;
  readonly chain: readonly DelegationGrantAdmissionUseV1[];
  readonly effective_authority: DelegationAuthoritySourceV1;
}

/** Resolves one durable Grant path. It has no admission, Runtime, or execution role. */
export class DurableDelegationAuthorityResolverV1 {
  constructor(private readonly nativeCore: AsyncNativeCoreRepository, private readonly ownerResolver: DelegationAuthorityResolverV1) {}

  async resolve(input: { readonly grant_ref: DelegationGrantRevisionRefV1; readonly at: number }): Promise<EffectiveDelegatedAuthorityV1> {
    const chain = await this.loadExactChain(input.grant_ref);
    validateDelegationAdmissionChainV1(chain, input.at);
    const basis = selectDelegationAuthorityBasisV1([chain.at(-1)!]);
    const root = chain[0]!.revision;
    let effective = await this.ownerResolver.resolveDelegatorAuthority({
      tenant_id: root.ref.tenant_id,
      delegator: root.delegator,
      at: input.at,
      governing_authority_refs: root.governing_authority_refs,
      governing_policy_refs: root.governing_policy_refs,
    }).catch(() => { throw new DelegationResolutionError("AUTHORITY_REFERENCE_UNRESOLVED", "Canonical authority owner is unavailable"); });
    assertDelegationGrantAttenuatesSourceV1(root, effective);
    for (const use of chain.slice(1)) {
      assertDelegationGrantAttenuatesSourceV1(use.revision, effective);
      effective = { ...effective, authority_bounds: use.revision.authority_bounds, valid_from: use.revision.valid_from, expires_at: use.revision.expires_at, onward_delegation_allowed: use.revision.onward_delegation_allowed, max_delegation_depth: use.revision.max_delegation_depth };
    }
    return { authority_basis: basis, chain, effective_authority: effective };
  }

  private async loadExactChain(ref: DelegationGrantRevisionRefV1): Promise<readonly DelegationGrantAdmissionUseV1[]> {
    const reverse: DelegationGrantAdmissionUseV1[] = [];
    let current: DelegationGrantRevisionRefV1 | undefined = ref;
    while (current) {
      const lineage: NativeDelegationGrantLineage | undefined = await this.nativeCore.getDelegationGrantLineage(current.grant_id).catch(() => undefined);
      const revision: DelegationGrantRevisionV1 | undefined = lineage?.revisions.find((candidate: DelegationGrantRevisionV1) => candidate.ref.tenant_id === current!.tenant_id && candidate.ref.revision === current!.revision && candidate.ref.fingerprint === current!.fingerprint);
      if (!lineage || !revision) throw new DelegationResolutionError("AUTHORITY_REFERENCE_UNRESOLVED", "Exact historical Grant revision is unavailable");
      if (lineage.head.tenant_id !== current.tenant_id) throw new DelegationResolutionError("TENANT_MISMATCH", "Grant chain crosses Tenant boundary");
      reverse.push({ head: lineage.head, revision }); current = revision.parent_grant_ref;
    }
    return reverse.reverse();
  }
}
