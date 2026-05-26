/**
 * Calls Register Phone Command
 *
 * Registers a phone call for custom telephony (caller handles actual dialing).
 * Usage: retell calls register-phone --agent-id <id> [options]
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { loadJsonArg, loadStringRecordArg } from "../../services/json-arg";
import { parseNumericFlag } from "../../services/numeric-flag";
import { requireNonEmpty } from "../../services/flag-guards";
import type { CallRegisterPhoneCallParams } from "retell-sdk/resources/call";

export interface RegisterPhoneCallOptions {
  agentId: string;
  agentVersion?: string;
  direction?: string;
  fromNumber?: string;
  toNumber?: string;
  metadata?: string;
  dynamicVariables?: string;
  fields?: string;
}

export async function registerPhoneCallCommand(
  options: RegisterPhoneCallOptions,
): Promise<void> {
  try {
    if (
      options.direction &&
      !["inbound", "outbound"].includes(options.direction)
    ) {
      throwValidation("--direction must be 'inbound' or 'outbound'");
    }

    const params: CallRegisterPhoneCallParams = {
      agent_id: requireNonEmpty(options.agentId, "--agent-id"),
    };

    if (options.agentVersion !== undefined) {
      params.agent_version = parseNumericFlag(
        options.agentVersion,
        "--agent-version",
      );
    }
    if (options.direction)
      params.direction = options.direction as "inbound" | "outbound";
    if (options.fromNumber !== undefined) {
      params.from_number = requireNonEmpty(options.fromNumber, "--from-number");
    }
    if (options.toNumber !== undefined) {
      params.to_number = requireNonEmpty(options.toNumber, "--to-number");
    }

    const metadata = loadJsonArg(options.metadata, "--metadata");
    if (metadata !== undefined) params.metadata = metadata;

    const dv = loadStringRecordArg(
      options.dynamicVariables,
      "--dynamic-variables",
    );
    if (dv !== undefined) params.retell_llm_dynamic_variables = dv;

    const client = getRetellClient();
    const result = await client.call.registerPhoneCall(params);

    const output = options.fields
      ? filterFields(
          result,
          options.fields.split(",").map((f) => f.trim()),
        )
      : result;

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}

function throwValidation(message: string): never {
  const err = new Error(message);
  err.name = "ValidationError";
  throw err;
}
