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
import {
  parseWeightedAgents,
  applyWeightedAgents,
} from "../../services/weighted-agents";
import type { PhoneNumberImportParams } from "retell-sdk/resources/phone-number";

export { parseWeightedAgents };

export interface ImportPhoneNumberOptions {
  number: string;
  terminationUri: string;
  nickname?: string;
  inboundAgent?: string;
  outboundAgent?: string;
  inboundAgents?: string;
  outboundAgents?: string;
  inboundSmsAgents?: string;
  outboundSmsAgents?: string;
  sipUsername?: string;
  sipPassword?: string;
  fields?: string;
}

export async function importPhoneNumberCommand(
  options: ImportPhoneNumberOptions,
): Promise<void> {
  try {
    const importParams: PhoneNumberImportParams = {
      phone_number: options.number,
      termination_uri: options.terminationUri,
    };

    if (options.nickname) {
      importParams.nickname = options.nickname;
    }

    applyWeightedAgents(importParams as unknown as Record<string, unknown>, {
      inboundAgent: options.inboundAgent,
      outboundAgent: options.outboundAgent,
      inboundAgents: options.inboundAgents,
      outboundAgents: options.outboundAgents,
      inboundSmsAgents: options.inboundSmsAgents,
      outboundSmsAgents: options.outboundSmsAgents,
    });

    if (options.sipUsername) {
      importParams.sip_trunk_auth_username = options.sipUsername;
    }

    if (options.sipPassword) {
      importParams.sip_trunk_auth_password = options.sipPassword;
    }

    const client = getRetellClient();
    const pn = await client.phoneNumber.import(importParams);

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
