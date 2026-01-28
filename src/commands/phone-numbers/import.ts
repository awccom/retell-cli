/**
 * Phone Numbers Import Command
 *
 * Imports a phone number from custom telephony.
 * Usage: retell phone-numbers import --number <number> --termination-uri <uri> [options]
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";

export interface ImportPhoneNumberOptions {
  number: string;
  terminationUri: string;
  nickname?: string;
  inboundAgent?: string;
  outboundAgent?: string;
  sipUsername?: string;
  sipPassword?: string;
  fields?: string;
}

/**
 * Import a phone number from custom telephony
 *
 * @param options Command options
 */
export async function importPhoneNumberCommand(
  options: ImportPhoneNumberOptions,
): Promise<void> {
  try {
    const client = getRetellClient();

    const importParams: Record<string, unknown> = {
      phone_number: options.number,
      termination_uri: options.terminationUri,
    };

    if (options.nickname) {
      importParams.nickname = options.nickname;
    }

    if (options.inboundAgent) {
      importParams.inbound_agent_id = options.inboundAgent;
    }

    if (options.outboundAgent) {
      importParams.outbound_agent_id = options.outboundAgent;
    }

    if (options.sipUsername) {
      importParams.sip_trunk_auth_username = options.sipUsername;
    }

    if (options.sipPassword) {
      importParams.sip_trunk_auth_password = options.sipPassword;
    }

    const pn = await client.phoneNumber.import(importParams as any);

    // Apply field filtering if requested
    const output = options.fields
      ? filterFields(
          pn,
          options.fields.split(",").map((f) => f.trim()),
        )
      : pn;

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
