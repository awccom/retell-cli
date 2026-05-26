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
import {
  loadJsonArg,
  loadStringRecordArg,
  readJsonObjectFile,
} from "../../services/json-arg";
import { parseNumericFlag } from "../../services/numeric-flag";
import { requireNonEmpty } from "../../services/flag-guards";
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
      from_number: requireNonEmpty(options.fromNumber, "--from-number"),
      to_number: requireNonEmpty(options.toNumber, "--to-number"),
    };

    if (options.overrideAgentId)
      params.override_agent_id = options.overrideAgentId;
    if (options.overrideAgentVersion !== undefined) {
      params.override_agent_version = parseNumericFlag(
        options.overrideAgentVersion,
        "--override-agent-version",
      );
    }
    if (options.ignoreE164Validation) params.ignore_e164_validation = true;

    const metadata = loadJsonArg(options.metadata, "--metadata");
    if (metadata !== undefined) params.metadata = metadata;

    const dv = loadStringRecordArg(
      options.dynamicVariables,
      "--dynamic-variables",
    );
    if (dv !== undefined) params.retell_llm_dynamic_variables = dv;

    const headers = loadJsonArg(
      options.customSipHeaders,
      "--custom-sip-headers",
    );
    if (headers !== undefined)
      params.custom_sip_headers = headers as Record<string, string>;

    if (options.agentOverride) {
      const override = readJsonObjectFile(
        options.agentOverride,
        "--agent-override",
      );
      params.agent_override =
        override as unknown as CallCreatePhoneCallParams.AgentOverride;
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
