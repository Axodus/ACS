import {
  AccountDisabledError,
  AccountIdentityService,
  AccountSuspendedError,
  ExpiredAcsSessionError,
  InvalidAcsSessionError,
  RevokedAcsSessionError,
} from "../control-plane/account-identity.js";
import {
  HttpAuthenticationError,
  createAcsAuthContext,
  type AcsAuthContext,
  type HttpIdentityValidator,
  type HttpIdentityValidatorDescriptor,
  type HttpIdentityValidatorHealth,
} from "./auth.js";

export class SiwxSessionIdentityValidator implements HttpIdentityValidator {
  readonly descriptor: HttpIdentityValidatorDescriptor = {
    mode: "siwx",
    provider: "reown_appkit_acs_siwx_session",
    productionOriented: false,
    issuer: "acs-siwx",
  };

  constructor(readonly accountIdentity: AccountIdentityService) {}

  async authenticate(headers: Readonly<Record<string, string | undefined>>): Promise<AcsAuthContext> {
    const authorization = headers.authorization?.trim();
    if (!authorization) throw new HttpAuthenticationError("missing_credentials", "ACS session credential is required");
    const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
    if (!match?.[1]) throw new HttpAuthenticationError("malformed_token", "ACS session credential is malformed");
    try {
      const authenticated = await this.accountIdentity.authenticateSessionToken(match[1]);
      return createAcsAuthContext({
        mode: "siwx",
        actorType: "user",
        actorId: authenticated.account.accountId,
        wallet: authenticated.identity.normalizedAddress,
        authenticated: true,
        trusted: true,
        platformAdmin: false,
        principal: {
          principalId: authenticated.account.accountId,
          issuer: "acs-siwx",
          subject: authenticated.account.accountId,
          authenticationMethod: "siwx_session",
        },
      });
    } catch (error) {
      if (error instanceof AccountSuspendedError) {
        throw new HttpAuthenticationError("account_suspended", "ACS account is suspended", 403);
      }
      if (error instanceof AccountDisabledError) {
        throw new HttpAuthenticationError("account_disabled", "ACS account is disabled", 403);
      }
      if (error instanceof ExpiredAcsSessionError) {
        throw new HttpAuthenticationError("expired_token", "ACS session has expired");
      }
      if (error instanceof RevokedAcsSessionError) {
        throw new HttpAuthenticationError("revoked_token", "ACS session has been revoked");
      }
      if (error instanceof InvalidAcsSessionError) {
        throw new HttpAuthenticationError("malformed_token", "ACS session credential is invalid");
      }
      throw error;
    }
  }

  async health(): Promise<HttpIdentityValidatorHealth> {
    return {
      configured: true,
      reachable: true,
      detail: "ACS SIWX session validation is configured; production eligibility remains disabled",
    };
  }
}
