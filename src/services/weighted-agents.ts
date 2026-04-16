/**
 * Weighted Agents Service
 *
 * Parses weighted agent specs used by phone-number routing flags and writes
 * them onto SDK params objects. Shared by `phone-numbers import/create/update`.
 */

export interface WeightedAgent {
  agent_id: string;
  weight: number;
}

/**
 * Parse a weighted agents spec string into an array of { agent_id, weight }.
 *
 * Formats:
 *   "agent_1"              -> [{ agent_id: "agent_1", weight: 1 }]
 *   "agent_1:0.6,agent_2:0.4" -> [{ agent_id: "agent_1", weight: 0.6 }, { agent_id: "agent_2", weight: 0.4 }]
 *
 * Throws a `ValidationError` (Error with name="ValidationError") for empty
 * specs, malformed entries, out-of-range weights, mixed weighted/unweighted,
 * and sums that don't total 1.0.
 */
export function parseWeightedAgents(spec: string): WeightedAgent[] {
  const entries = spec
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (entries.length === 0) {
    throwValidation("Empty agent spec. Provide at least one agent ID.");
  }

  const agents: WeightedAgent[] = entries.map((entry) => {
    const parts = entry.split(":");
    if (parts.length > 2) {
      throwValidation(
        `Invalid agent spec "${entry}". Expected format: agent_id or agent_id:weight`,
      );
    }
    const agentId = parts[0].trim();
    if (!agentId) {
      throwValidation(`Invalid agent spec "${entry}". Agent ID is empty.`);
    }
    if (parts.length === 1) {
      return { agent_id: agentId, weight: -1 };
    }
    const weight = Number(parts[1]);
    if (isNaN(weight) || weight <= 0 || weight > 1) {
      throwValidation(
        `Invalid weight "${parts[1]}" for agent "${agentId}". Weight must be a number between 0 (exclusive) and 1 (inclusive).`,
      );
    }
    return { agent_id: agentId, weight };
  });

  const allDefault = agents.every((a) => a.weight === -1);
  if (allDefault) {
    const w = 1 / agents.length;
    for (const a of agents) a.weight = w;
  } else if (agents.some((a) => a.weight === -1)) {
    throwValidation(
      "Cannot mix agents with and without weights. Either specify weights for all agents or none.",
    );
  }

  const sum = agents.reduce((s, a) => s + a.weight, 0);
  if (Math.abs(sum - 1.0) > 0.001) {
    throwValidation(
      `Agent weights must sum to 1.0, but got ${sum.toFixed(4)}.`,
    );
  }

  return agents;
}

export interface WeightedAgentFlags {
  inboundAgent?: string;
  outboundAgent?: string;
  inboundAgents?: string;
  outboundAgents?: string;
  inboundSmsAgents?: string;
  outboundSmsAgents?: string;
}

export interface ApplyWeightedAgentsOptions {
  allowSms?: boolean;
}

/**
 * Validate weighted-agent flag combinations and write them onto a params object.
 *
 * Throws a `ValidationError` (Error with name="ValidationError") for:
 *   - `--inbound-agent` combined with `--inbound-agents`
 *   - `--outbound-agent` combined with `--outbound-agents`
 *   - SMS flags supplied when `allowSms: false`
 */
export function applyWeightedAgents(
  params: Record<string, unknown>,
  flags: WeightedAgentFlags,
  options: ApplyWeightedAgentsOptions = { allowSms: true },
): void {
  for (const [flagName, val] of [
    ["--inbound-agent", flags.inboundAgent],
    ["--outbound-agent", flags.outboundAgent],
    ["--inbound-agents", flags.inboundAgents],
    ["--outbound-agents", flags.outboundAgents],
    ["--inbound-sms-agents", flags.inboundSmsAgents],
    ["--outbound-sms-agents", flags.outboundSmsAgents],
  ] as const) {
    if (val !== undefined && val.trim() === "") {
      throwValidation(`${flagName} must not be empty`);
    }
  }

  if (flags.inboundAgent && flags.inboundAgents) {
    throwValidation(
      "--inbound-agent and --inbound-agents are mutually exclusive. Use one or the other.",
    );
  }
  if (flags.outboundAgent && flags.outboundAgents) {
    throwValidation(
      "--outbound-agent and --outbound-agents are mutually exclusive. Use one or the other.",
    );
  }
  if (
    !options.allowSms &&
    (flags.inboundSmsAgents || flags.outboundSmsAgents)
  ) {
    throwValidation("SMS agent flags are not supported for this command.");
  }

  if (flags.inboundAgent) {
    params.inbound_agents = [{ agent_id: flags.inboundAgent, weight: 1 }];
  } else if (flags.inboundAgents) {
    params.inbound_agents = parseWeightedAgents(flags.inboundAgents);
  }

  if (flags.outboundAgent) {
    params.outbound_agents = [{ agent_id: flags.outboundAgent, weight: 1 }];
  } else if (flags.outboundAgents) {
    params.outbound_agents = parseWeightedAgents(flags.outboundAgents);
  }

  if (flags.inboundSmsAgents) {
    params.inbound_sms_agents = parseWeightedAgents(flags.inboundSmsAgents);
  }
  if (flags.outboundSmsAgents) {
    params.outbound_sms_agents = parseWeightedAgents(flags.outboundSmsAgents);
  }
}

function throwValidation(message: string): never {
  const err = new Error(message);
  err.name = "ValidationError";
  throw err;
}
