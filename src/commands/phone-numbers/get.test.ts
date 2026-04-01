/**
 * Unit tests for phone numbers get command
 *
 * Tests retrieval, formatting, and field filtering.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPhoneNumberCommand } from "./get";
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

describe("getPhoneNumberCommand", () => {
  let mockClient: any;

  const mockPhoneNumber = {
    phone_number: "+14157774444",
    phone_number_pretty: "(415) 777-4444",
    phone_number_type: "twilio",
    nickname: "Support Line",
    inbound_agents: [{ agent_id: "agent_123", weight: 1 }],
    outbound_agents: [{ agent_id: "agent_456", weight: 1 }],
    termination_uri: null,
    sip_trunk_auth_username: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      phoneNumber: {
        retrieve: vi.fn().mockResolvedValue(mockPhoneNumber),
      },
    };

    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  describe("successful retrieval", () => {
    it("should retrieve phone number details", async () => {
      await getPhoneNumberCommand("+14157774444");

      expect(mockClient.phoneNumber.retrieve).toHaveBeenCalledWith(
        "+14157774444",
      );
      expect(outputFormatter.outputJson).toHaveBeenCalledWith(mockPhoneNumber);
    });
  });

  describe("field filtering", () => {
    it("should apply field filtering when --fields is specified", async () => {
      await getPhoneNumberCommand("+14157774444", {
        fields: "phone_number,inbound_agents",
      });

      expect(outputFormatter.filterFields).toHaveBeenCalledWith(
        mockPhoneNumber,
        ["phone_number", "inbound_agents"],
      );
    });
  });

  describe("error handling", () => {
    it("should handle not found errors via handleSdkError", async () => {
      const notFoundError = new Error("Phone number not found");
      mockClient.phoneNumber.retrieve.mockRejectedValue(notFoundError);

      await getPhoneNumberCommand("+14159999999");

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
        notFoundError,
      );
    });

    it("should handle API errors via handleSdkError", async () => {
      const apiError = new Error("API Error");
      mockClient.phoneNumber.retrieve.mockRejectedValue(apiError);

      await getPhoneNumberCommand("+14157774444");

      expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(apiError);
    });
  });
});
