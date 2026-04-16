/**
 * Unit tests for weighted-agents service
 */

import { describe, it, expect } from "vitest";
import { parseWeightedAgents, applyWeightedAgents } from "./weighted-agents";

describe("parseWeightedAgents", () => {
  it("parses a single agent without weight", () => {
    expect(parseWeightedAgents("agent_123")).toEqual([
      { agent_id: "agent_123", weight: 1 },
    ]);
  });

  it("parses a single agent with weight 1", () => {
    expect(parseWeightedAgents("agent_123:1")).toEqual([
      { agent_id: "agent_123", weight: 1 },
    ]);
  });

  it("parses multiple agents with weights", () => {
    expect(parseWeightedAgents("agent_1:0.6,agent_2:0.4")).toEqual([
      { agent_id: "agent_1", weight: 0.6 },
      { agent_id: "agent_2", weight: 0.4 },
    ]);
  });

  it("assigns equal weights when all omitted", () => {
    const result = parseWeightedAgents("agent_1,agent_2");
    expect(result).toHaveLength(2);
    expect(result[0].weight + result[1].weight).toBeCloseTo(1.0);
  });

  it("throws ValidationError on empty spec", () => {
    try {
      parseWeightedAgents("");
      expect.fail("Expected error to be thrown");
    } catch (err) {
      expect((err as Error).name).toBe("ValidationError");
      expect((err as Error).message).toMatch(/Empty agent spec/);
    }
  });

  it("throws ValidationError on non-numeric weight", () => {
    try {
      parseWeightedAgents("agent_1:abc");
      expect.fail("Expected error to be thrown");
    } catch (err) {
      expect((err as Error).name).toBe("ValidationError");
      expect((err as Error).message).toMatch(/Invalid weight/);
    }
  });

  it("throws ValidationError on weight out of range", () => {
    for (const spec of ["agent_1:0", "agent_1:1.5"]) {
      try {
        parseWeightedAgents(spec);
        expect.fail(`Expected error for spec "${spec}"`);
      } catch (err) {
        expect((err as Error).name).toBe("ValidationError");
        expect((err as Error).message).toMatch(/Invalid weight/);
      }
    }
  });

  it("throws ValidationError when weights don't sum to 1.0", () => {
    try {
      parseWeightedAgents("agent_1:0.3,agent_2:0.3");
      expect.fail("Expected error to be thrown");
    } catch (err) {
      expect((err as Error).name).toBe("ValidationError");
      expect((err as Error).message).toMatch(/must sum to 1\.0/);
    }
  });

  it("throws ValidationError when mixing weighted and unweighted agents", () => {
    try {
      parseWeightedAgents("agent_1:0.5,agent_2");
      expect.fail("Expected error to be thrown");
    } catch (err) {
      expect((err as Error).name).toBe("ValidationError");
      expect((err as Error).message).toMatch(/Cannot mix/);
    }
  });

  it("accepts three-way split at the tolerance edge (0.333 x 3)", () => {
    const result = parseWeightedAgents(
      "agent_1:0.333,agent_2:0.333,agent_3:0.334",
    );
    expect(result).toHaveLength(3);
  });

  it("accepts floating-point sum within tolerance (0.1 + 0.2 + 0.7)", () => {
    expect(() =>
      parseWeightedAgents("agent_1:0.1,agent_2:0.2,agent_3:0.7"),
    ).not.toThrow();
  });

  it("rejects entries with more than one colon as ValidationError", () => {
    try {
      parseWeightedAgents("agent_1:0.5:extra");
      expect.fail("Expected error to be thrown");
    } catch (err) {
      expect((err as Error).name).toBe("ValidationError");
      expect((err as Error).message).toMatch(/Invalid agent spec/);
    }
  });

  it("rejects trailing colon (empty weight) as ValidationError", () => {
    try {
      parseWeightedAgents("agent_1:");
      expect.fail("Expected error to be thrown");
    } catch (err) {
      expect((err as Error).name).toBe("ValidationError");
      expect((err as Error).message).toMatch(/Invalid weight/);
    }
  });

  it("rejects whitespace-only spec as ValidationError", () => {
    for (const spec of ["   ", " , "]) {
      try {
        parseWeightedAgents(spec);
        expect.fail(`Expected error for spec "${spec}"`);
      } catch (err) {
        expect((err as Error).name).toBe("ValidationError");
        expect((err as Error).message).toMatch(/Empty agent spec/);
      }
    }
  });

  it("rejects empty agent_id with weight as ValidationError", () => {
    try {
      parseWeightedAgents(":0.5");
      expect.fail("Expected error to be thrown");
    } catch (err) {
      expect((err as Error).name).toBe("ValidationError");
      expect((err as Error).message).toMatch(/Agent ID is empty/);
    }
  });

  it("rejects empty agent_id inside a weighted list as ValidationError", () => {
    try {
      parseWeightedAgents("agent_1:0.5,:0.5");
      expect.fail("Expected error to be thrown");
    } catch (err) {
      expect((err as Error).name).toBe("ValidationError");
      expect((err as Error).message).toMatch(/Agent ID is empty/);
    }
  });
});

describe("applyWeightedAgents", () => {
  it("writes inbound_agents from --inbound-agent", () => {
    const params: Record<string, unknown> = {};
    applyWeightedAgents(params, { inboundAgent: "agent_1" });
    expect(params.inbound_agents).toEqual([{ agent_id: "agent_1", weight: 1 }]);
  });

  it("writes outbound_agents from --outbound-agents spec", () => {
    const params: Record<string, unknown> = {};
    applyWeightedAgents(params, {
      outboundAgents: "agent_1:0.5,agent_2:0.5",
    });
    expect(params.outbound_agents).toEqual([
      { agent_id: "agent_1", weight: 0.5 },
      { agent_id: "agent_2", weight: 0.5 },
    ]);
  });

  it("writes inbound and outbound SMS agents when allowSms is true", () => {
    const params: Record<string, unknown> = {};
    applyWeightedAgents(
      params,
      {
        inboundSmsAgents: "agent_1",
        outboundSmsAgents: "agent_2",
      },
      { allowSms: true },
    );
    expect(params.inbound_sms_agents).toEqual([
      { agent_id: "agent_1", weight: 1 },
    ]);
    expect(params.outbound_sms_agents).toEqual([
      { agent_id: "agent_2", weight: 1 },
    ]);
  });

  it("throws ValidationError when SMS flags provided with allowSms: false", () => {
    const params: Record<string, unknown> = {};
    try {
      applyWeightedAgents(
        params,
        { inboundSmsAgents: "agent_1" },
        { allowSms: false },
      );
      expect.fail("Expected error to be thrown");
    } catch (err) {
      expect((err as Error).name).toBe("ValidationError");
      expect((err as Error).message).toMatch(/SMS agent flags/i);
    }
  });

  it("throws ValidationError on inbound mutual exclusion", () => {
    const params: Record<string, unknown> = {};
    try {
      applyWeightedAgents(params, {
        inboundAgent: "a",
        inboundAgents: "b",
      });
      expect.fail("Expected error to be thrown");
    } catch (err) {
      expect((err as Error).name).toBe("ValidationError");
      expect((err as Error).message).toMatch(
        /--inbound-agent and --inbound-agents/,
      );
    }
  });

  it("throws ValidationError on outbound mutual exclusion", () => {
    const params: Record<string, unknown> = {};
    try {
      applyWeightedAgents(params, {
        outboundAgent: "a",
        outboundAgents: "b",
      });
      expect.fail("Expected error to be thrown");
    } catch (err) {
      expect((err as Error).name).toBe("ValidationError");
      expect((err as Error).message).toMatch(
        /--outbound-agent and --outbound-agents/,
      );
    }
  });

  it("rejects empty-string single-agent flags as ValidationError", () => {
    for (const [flag, key] of [
      ["--inbound-agent", "inboundAgent"],
      ["--outbound-agent", "outboundAgent"],
      ["--inbound-agents", "inboundAgents"],
      ["--outbound-agents", "outboundAgents"],
      ["--inbound-sms-agents", "inboundSmsAgents"],
      ["--outbound-sms-agents", "outboundSmsAgents"],
    ] as const) {
      const params: Record<string, unknown> = {};
      try {
        applyWeightedAgents(params, { [key]: "" });
        expect.fail(`Expected error for empty ${flag}`);
      } catch (err) {
        expect((err as Error).name).toBe("ValidationError");
        expect((err as Error).message).toMatch(
          new RegExp(`${flag} must not be empty`),
        );
      }
    }
  });
});
