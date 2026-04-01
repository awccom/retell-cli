/**
 * Unit tests for phone numbers import command
 *
 * Tests import with various options, weighted agents parsing, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { importPhoneNumberCommand, parseWeightedAgents } from "./import";
import * as retellClient from "../../services/retell-client";
import * as outputFormatter from "../../services/output-formatter";

// Mock dependencies
vi.mock("../../services/retell-client");
vi.mock("../../services/output-formatter", async () => {
  const actual = await vi.importActual("../../services/output-formatter");
  return {
    ...actual,
    outputJson: vi.fn(),
    handleSdkError: vi.fn(),
    filterFields: vi.fn((data, _fields) => data),
  };
});

describe("parseWeightedAgents", () => {
  it("should parse a single agent without weight", () => {
    expect(parseWeightedAgents("agent_123")).toEqual([
      { agent_id: "agent_123", weight: 1 },
    ]);
  });

  it("should parse a single agent with weight 1", () => {
    expect(parseWeightedAgents("agent_123:1")).toEqual([
      { agent_id: "agent_123", weight: 1 },
    ]);
  });

  it("should parse multiple agents with weights", () => {
    expect(parseWeightedAgents("agent_1:0.6,agent_2:0.4")).toEqual([
      { agent_id: "agent_1", weight: 0.6 },
      { agent_id: "agent_2", weight: 0.4 },
    ]);
  });

  it("should parse multiple agents without weights (equal distribution)", () => {
    const result = parseWeightedAgents("agent_1,agent_2");
    expect(result).toHaveLength(2);
    expect(result[0].agent_id).toBe("agent_1");
    expect(result[1].agent_id).toBe("agent_2");
    expect(result[0].weight + result[1].weight).toBeCloseTo(1.0);
  });

  it("should throw on empty spec", () => {
    expect(() => parseWeightedAgents("")).toThrow("Empty agent spec");
  });

  it("should throw on invalid weight", () => {
    expect(() => parseWeightedAgents("agent_1:abc")).toThrow("Invalid weight");
  });

  it("should throw on weight out of range", () => {
    expect(() => parseWeightedAgents("agent_1:0")).toThrow("Invalid weight");
    expect(() => parseWeightedAgents("agent_1:1.5")).toThrow("Invalid weight");
  });

  it("should throw when weights don't sum to 1", () => {
    expect(() => parseWeightedAgents("agent_1:0.3,agent_2:0.3")).toThrow(
      "must sum to 1.0",
    );
  });

  it("should throw when mixing weighted and unweighted agents", () => {
    expect(() => parseWeightedAgents("agent_1:0.5,agent_2")).toThrow(
      "Cannot mix",
    );
  });
});

describe("importPhoneNumberCommand", () => {
  let mockClient: any;
  let mockExit: any;

  const mockImportedPhoneNumber = {
    phone_number: "+14157774444",
    phone_number_pretty: "(415) 777-4444",
    phone_number_type: "custom",
    nickname: "Support Line",
    inbound_agents: [{ agent_id: "agent_123", weight: 1 }],
    outbound_agents: null,
    termination_uri: "someuri.pstn.twilio.com",
    sip_trunk_auth_username: "user123",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      phoneNumber: {
        import: vi.fn().mockResolvedValue(mockImportedPhoneNumber),
      },
    };

    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
    mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  describe("successful import", () => {
    it("should import phone number with required options only", async () => {
      await importPhoneNumberCommand({
        number: "+14157774444",
        terminationUri: "someuri.pstn.twilio.com",
      });

      expect(mockClient.phoneNumber.import).toHaveBeenCalledWith({
        phone_number: "+14157774444",
        termination_uri: "someuri.pstn.twilio.com",
      });
      expect(outputFormatter.outputJson).toHaveBeenCalledWith(
        mockImportedPhoneNumber,
      );
    });

    it("should translate --inbound-agent to inbound_agents array", async () => {
      await importPhoneNumberCommand({
        number: "+14157774444",
        terminationUri: "someuri.pstn.twilio.com",
        inboundAgent: "agent_123",
      });

      expect(mockClient.phoneNumber.import).toHaveBeenCalledWith({
        phone_number: "+14157774444",
        termination_uri: "someuri.pstn.twilio.com",
        inbound_agents: [{ agent_id: "agent_123", weight: 1 }],
      });
    });

    it("should translate --outbound-agent to outbound_agents array", async () => {
      await importPhoneNumberCommand({
        number: "+14157774444",
        terminationUri: "someuri.pstn.twilio.com",
        outboundAgent: "agent_456",
      });

      expect(mockClient.phoneNumber.import).toHaveBeenCalledWith({
        phone_number: "+14157774444",
        termination_uri: "someuri.pstn.twilio.com",
        outbound_agents: [{ agent_id: "agent_456", weight: 1 }],
      });
    });

    it("should parse --inbound-agents weighted spec", async () => {
      await importPhoneNumberCommand({
        number: "+14157774444",
        terminationUri: "someuri.pstn.twilio.com",
        inboundAgents: "agent_1:0.6,agent_2:0.4",
      });

      expect(mockClient.phoneNumber.import).toHaveBeenCalledWith({
        phone_number: "+14157774444",
        termination_uri: "someuri.pstn.twilio.com",
        inbound_agents: [
          { agent_id: "agent_1", weight: 0.6 },
          { agent_id: "agent_2", weight: 0.4 },
        ],
      });
    });

    it("should import with all options", async () => {
      await importPhoneNumberCommand({
        number: "+14157774444",
        terminationUri: "someuri.pstn.twilio.com",
        nickname: "Support Line",
        inboundAgents: "agent_123:1",
        outboundAgents: "agent_456:1",
        sipUsername: "user123",
        sipPassword: "pass456",
      });

      expect(mockClient.phoneNumber.import).toHaveBeenCalledWith({
        phone_number: "+14157774444",
        termination_uri: "someuri.pstn.twilio.com",
        nickname: "Support Line",
        inbound_agents: [{ agent_id: "agent_123", weight: 1 }],
        outbound_agents: [{ agent_id: "agent_456", weight: 1 }],
        sip_trunk_auth_username: "user123",
        sip_trunk_auth_password: "pass456",
      });
    });
  });

  describe("mutual exclusion", () => {
    it("should error when both --inbound-agent and --inbound-agents are provided", async () => {
      await importPhoneNumberCommand({
        number: "+14157774444",
        terminationUri: "someuri.pstn.twilio.com",
        inboundAgent: "agent_1",
        inboundAgents: "agent_2:1",
      });

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockClient.phoneNumber.import).not.toHaveBeenCalled();
    });

    it("should error when both --outbound-agent and --outbound-agents are provided", async () => {
      await importPhoneNumberCommand({
        number: "+14157774444",
        terminationUri: "someuri.pstn.twilio.com",
        outboundAgent: "agent_1",
        outboundAgents: "agent_2:1",
      });

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockClient.phoneNumber.import).not.toHaveBeenCalled();
    });
  });

  describe("field filtering", () => {
    it("should apply field filtering when --fields is specified", async () => {
      await importPhoneNumberCommand({
        number: "+14157774444",
        terminationUri: "someuri.pstn.twilio.com",
        fields: "phone_number,termination_uri",
      });

      expect(outputFormatter.filterFields).toHaveBeenCalledWith(
        mockImportedPhoneNumber,
        ["phone_number", "termination_uri"],
      );
    });
  });

  describe("error handling", () => {
    it("should handle API errors via handleSdkError", async () => {
      const apiError = new Error("Invalid phone number format");
      mockClient.phoneNumber.import.mockRejectedValue(apiError);

      await importPhoneNumberCommand({
        number: "invalid",
        terminationUri: "someuri.pstn.twilio.com",
      });

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(apiError);
    });

    it("should handle invalid termination URI errors", async () => {
      const apiError = new Error("Invalid termination URI");
      mockClient.phoneNumber.import.mockRejectedValue(apiError);

      await importPhoneNumberCommand({
        number: "+14157774444",
        terminationUri: "invalid-uri",
      });

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(apiError);
    });
  });
});
