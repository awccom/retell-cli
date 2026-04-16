/**
 * Calls Create Phone Command
 *
 * Creates a new outbound phone call.
 * Usage: retell calls create-phone --from-number <n> --to-number <n> [options]
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { loadJsonArg, readJsonFile } from "../../services/json-arg";
import type { CallCreatePhoneCallParams } from "retell-sdk/resources/call";

export interface CreatePhoneCallOptions {
  fromNumber: string;
  toNumber: string;
  overrideAgentId?: string;
  overrideAgentVersion?: string;
  metadata?: string;
  dynamicVariables?: string;
  customSipHeaders?: string;
  agentOverride?: string;
  ignoreE164Validation?: boolean;
  fields?: string;
}

export async function createPhoneCallCommand(
  options: CreatePhoneCallOptions,
): Promise<void> {
  try {
    const params: CallCreatePhoneCallParams = {
      from_number: options.fromNumber,
      to_number: options.toNumber,
    };

    if (options.overrideAgentId)
      params.override_agent_id = options.overrideAgentId;
    if (options.overrideAgentVersion !== undefined) {
      const v = Number(options.overrideAgentVersion);
      if (isNaN(v))
        throwValidation("--override-agent-version must be a number");
      params.override_agent_version = v;
    }
    if (options.ignoreE164Validation) params.ignore_e164_validation = true;

    const metadata = loadJsonArg(options.metadata, "--metadata");
    if (metadata !== undefined) params.metadata = metadata;

    const dv = loadJsonArg(options.dynamicVariables, "--dynamic-variables");
    if (dv !== undefined)
      params.retell_llm_dynamic_variables = dv as Record<string, unknown>;

    const headers = loadJsonArg(
      options.customSipHeaders,
      "--custom-sip-headers",
    );
    if (headers !== undefined)
      params.custom_sip_headers = headers as Record<string, string>;

    if (options.agentOverride) {
      const override = readJsonFile(options.agentOverride, "--agent-override");
      params.agent_override =
        override as CallCreatePhoneCallParams.AgentOverride;
    }

    const client = getRetellClient();
    const result = await client.call.createPhoneCall(params);

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
