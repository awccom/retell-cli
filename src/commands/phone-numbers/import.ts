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
import type { PhoneNumberImportParams } from "retell-sdk/resources/phone-number";

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

interface WeightedAgent {
  agent_id: string;
  weight: number;
}

/**
 * Parse a weighted agents spec string into an array of { agent_id, weight }.
 *
 * Formats:
 *   "agent_1"              -> [{ agent_id: "agent_1", weight: 1 }]
 *   "agent_1:0.6,agent_2:0.4" -> [{ agent_id: "agent_1", weight: 0.6 }, { agent_id: "agent_2", weight: 0.4 }]
 */
export function parseWeightedAgents(spec: string): WeightedAgent[] {
  const entries = spec.split(",").map((s) => s.trim()).filter(Boolean);
  if (entries.length === 0) {
    throw new Error("Empty agent spec. Provide at least one agent ID.");
  }

  const agents: WeightedAgent[] = entries.map((entry) => {
    const parts = entry.split(":");
    if (parts.length === 1) {
      return { agent_id: parts[0], weight: -1 }; // sentinel: assign default later
    }
    if (parts.length === 2) {
      const weight = Number(parts[1]);
      if (isNaN(weight) || weight <= 0 || weight > 1) {
        throw new Error(
          `Invalid weight "${parts[1]}" for agent "${parts[0]}". Weight must be a number between 0 (exclusive) and 1 (inclusive).`,
        );
      }
      return { agent_id: parts[0], weight };
    }
    throw new Error(`Invalid agent spec "${entry}". Expected format: agent_id or agent_id:weight`);
  });

  // If all entries omitted weights, assign equal weights
  const allDefault = agents.every((a) => a.weight === -1);
  if (allDefault) {
    const w = 1 / agents.length;
    for (const a of agents) a.weight = w;
  } else if (agents.some((a) => a.weight === -1)) {
    throw new Error(
      "Cannot mix agents with and without weights. Either specify weights for all agents or none.",
    );
  }

  const sum = agents.reduce((s, a) => s + a.weight, 0);
  if (Math.abs(sum - 1.0) > 0.001) {
    throw new Error(
      `Agent weights must sum to 1.0, but got ${sum.toFixed(4)}.`,
    );
  }

  return agents;
}

/**
 * Import a phone number from custom telephony
 *
 * @param options Command options
 */
export async function importPhoneNumberCommand(
  options: ImportPhoneNumberOptions,
): Promise<void> {
  // Mutual exclusion checks
  if (options.inboundAgent && options.inboundAgents) {
    process.stderr.write(
      "Error: --inbound-agent and --inbound-agents are mutually exclusive. Use one or the other.\n",
    );
    process.exit(1);
    return;
  }
  if (options.outboundAgent && options.outboundAgents) {
    process.stderr.write(
      "Error: --outbound-agent and --outbound-agents are mutually exclusive. Use one or the other.\n",
    );
    process.exit(1);
    return;
  }

  try {
    const client = getRetellClient();

    const importParams: PhoneNumberImportParams = {
      phone_number: options.number,
      termination_uri: options.terminationUri,
    };

    if (options.nickname) {
      importParams.nickname = options.nickname;
    }

    if (options.inboundAgent) {
      importParams.inbound_agents = [
        { agent_id: options.inboundAgent, weight: 1 },
      ];
    } else if (options.inboundAgents) {
      importParams.inbound_agents = parseWeightedAgents(options.inboundAgents);
    }

    if (options.outboundAgent) {
      importParams.outbound_agents = [
        { agent_id: options.outboundAgent, weight: 1 },
      ];
    } else if (options.outboundAgents) {
      importParams.outbound_agents = parseWeightedAgents(
        options.outboundAgents,
      );
    }

    if (options.inboundSmsAgents) {
      (importParams as unknown as Record<string, unknown>).inbound_sms_agents =
        parseWeightedAgents(options.inboundSmsAgents);
    }

    if (options.outboundSmsAgents) {
      (importParams as unknown as Record<string, unknown>).outbound_sms_agents =
        parseWeightedAgents(options.outboundSmsAgents);
    }

    if (options.sipUsername) {
      importParams.sip_trunk_auth_username = options.sipUsername;
    }

    if (options.sipPassword) {
      importParams.sip_trunk_auth_password = options.sipPassword;
    }

    const pn = await client.phoneNumber.import(importParams);

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
