/**
 * Unit tests for phone numbers import command
 *
 * Tests import with various options and error handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { importPhoneNumberCommand } from "./import";
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

describe("importPhoneNumberCommand", () => {
  let mockClient: any;

  const mockImportedPhoneNumber = {
    phone_number: "+14157774444",
    phone_number_pretty: "(415) 777-4444",
    phone_number_type: "custom",
    nickname: "Support Line",
    inbound_agent_id: "agent_123",
    outbound_agent_id: null,
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

    it("should import phone number with all options", async () => {
      await importPhoneNumberCommand({
        number: "+14157774444",
        terminationUri: "someuri.pstn.twilio.com",
        nickname: "Support Line",
        inboundAgent: "agent_123",
        outboundAgent: "agent_456",
        sipUsername: "user123",
        sipPassword: "pass456",
      });

      expect(mockClient.phoneNumber.import).toHaveBeenCalledWith({
        phone_number: "+14157774444",
        termination_uri: "someuri.pstn.twilio.com",
        nickname: "Support Line",
        inbound_agent_id: "agent_123",
        outbound_agent_id: "agent_456",
        sip_trunk_auth_username: "user123",
        sip_trunk_auth_password: "pass456",
      });
    });

    it("should import phone number with partial optional options", async () => {
      await importPhoneNumberCommand({
        number: "+14157774444",
        terminationUri: "someuri.pstn.twilio.com",
        nickname: "My Line",
        inboundAgent: "agent_123",
      });

      expect(mockClient.phoneNumber.import).toHaveBeenCalledWith({
        phone_number: "+14157774444",
        termination_uri: "someuri.pstn.twilio.com",
        nickname: "My Line",
        inbound_agent_id: "agent_123",
      });
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
