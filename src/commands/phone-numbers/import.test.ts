/**
 * Unit tests for phone numbers import command
 *
 * Tests import with various options, weighted agents parsing, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { importPhoneNumberCommand } from "./import";
import * as retellClient from "../../services/retell-client";
import * as outputFormatter from "../../services/output-formatter";

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

describe("importPhoneNumberCommand", () => {
  let mockClient: any;

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

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
        expect.objectContaining({ name: "ValidationError" }),
      );
      expect(mockClient.phoneNumber.import).not.toHaveBeenCalled();
    });

    it("should error when both --outbound-agent and --outbound-agents are provided", async () => {
      await importPhoneNumberCommand({
        number: "+14157774444",
        terminationUri: "someuri.pstn.twilio.com",
        outboundAgent: "agent_1",
        outboundAgents: "agent_2:1",
      });

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
        expect.objectContaining({ name: "ValidationError" }),
      );
      expect(mockClient.phoneNumber.import).not.toHaveBeenCalled();
    });

    it("rejects --inbound-sms-agents (SMS fields not on ImportParams)", async () => {
      await importPhoneNumberCommand({
        number: "+14157774444",
        terminationUri: "someuri.pstn.twilio.com",
        inboundSmsAgents: "agent_sms",
      } as never);

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
        expect.objectContaining({ name: "ValidationError" }),
      );
      expect(mockClient.phoneNumber.import).not.toHaveBeenCalled();
    });

    it("rejects --outbound-sms-agents (SMS fields not on ImportParams)", async () => {
      await importPhoneNumberCommand({
        number: "+14157774444",
        terminationUri: "someuri.pstn.twilio.com",
        outboundSmsAgents: "agent_sms",
      } as never);

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
        expect.objectContaining({ name: "ValidationError" }),
      );
      expect(mockClient.phoneNumber.import).not.toHaveBeenCalled();
    });
  });

  describe("required flag guards", () => {
    it("rejects empty-string --number", async () => {
      await importPhoneNumberCommand({
        number: "",
        terminationUri: "someuri.pstn.twilio.com",
      });
      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
        expect.objectContaining({ name: "ValidationError" }),
      );
      expect(mockClient.phoneNumber.import).not.toHaveBeenCalled();
    });

    it("rejects empty-string --termination-uri", async () => {
      await importPhoneNumberCommand({
        number: "+14157774444",
        terminationUri: "",
      });
      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
        expect.objectContaining({ name: "ValidationError" }),
      );
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
  });
});
