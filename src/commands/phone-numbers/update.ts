/**
 * Phone Numbers Update Command
 *
 * Updates agent bindings and settings on a purchased phone number.
 * Usage: retell phone-numbers update <phone_number> [options]
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { applyWeightedAgents } from "../../services/weighted-agents";
import { requireNonEmpty } from "../../services/flag-guards";
import type { PhoneNumberUpdateParams } from "retell-sdk/resources/phone-number";

const VALID_TRANSPORTS = ["TLS", "TCP", "UDP"] as const;

export interface UpdatePhoneNumberOptions {
  nickname?: string;
  inboundAgent?: string;
  outboundAgent?: string;
  inboundAgents?: string;
  outboundAgents?: string;
  inboundSmsAgents?: string;
  outboundSmsAgents?: string;
  terminationUri?: string;
  sipUsername?: string;
  sipPassword?: string;
  transport?: string;
  inboundWebhookUrl?: string;
  inboundSmsWebhookUrl?: string;
  allowedInboundCountryList?: string;
  allowedOutboundCountryList?: string;
  fallbackNumber?: string;
  fields?: string;
}

export async function updatePhoneNumberCommand(
  phoneNumber: string,
  options: UpdatePhoneNumberOptions,
): Promise<void> {
  try {
    if (
      options.transport !== undefined &&
      options.transport !== "" &&
      !VALID_TRANSPORTS.includes(options.transport as never)
    ) {
      throwValidation(
        `--transport must be one of: ${VALID_TRANSPORTS.join(", ")}`,
      );
    }

    const params: PhoneNumberUpdateParams = {};

    if (options.nickname !== undefined)
      params.nickname = options.nickname === "" ? null : options.nickname;
    if (options.terminationUri !== undefined)
      params.termination_uri = requireNonEmpty(
        options.terminationUri,
        "--termination-uri",
      );
    if (options.sipUsername !== undefined)
      params.auth_username = requireNonEmpty(
        options.sipUsername,
        "--sip-username",
      );
    if (options.sipPassword !== undefined)
      params.auth_password = requireNonEmpty(
        options.sipPassword,
        "--sip-password",
      );
    if (options.transport !== undefined)
      params.transport = options.transport === "" ? null : options.transport;
    if (options.inboundWebhookUrl !== undefined)
      params.inbound_webhook_url =
        options.inboundWebhookUrl === "" ? null : options.inboundWebhookUrl;
    if (options.inboundSmsWebhookUrl !== undefined)
      params.inbound_sms_webhook_url =
        options.inboundSmsWebhookUrl === ""
          ? null
          : options.inboundSmsWebhookUrl;
    if (options.fallbackNumber !== undefined)
      params.fallback_number =
        options.fallbackNumber === "" ? null : options.fallbackNumber;
    if (options.allowedInboundCountryList !== undefined)
      params.allowed_inbound_country_list =
        options.allowedInboundCountryList === ""
          ? null
          : options.allowedInboundCountryList
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
    if (options.allowedOutboundCountryList !== undefined)
      params.allowed_outbound_country_list =
        options.allowedOutboundCountryList === ""
          ? null
          : options.allowedOutboundCountryList
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);

    applyWeightedAgents(
      params as unknown as Record<string, unknown>,
      {
        inboundAgent: options.inboundAgent,
        outboundAgent: options.outboundAgent,
        inboundAgents: options.inboundAgents,
        outboundAgents: options.outboundAgents,
        inboundSmsAgents: options.inboundSmsAgents,
        outboundSmsAgents: options.outboundSmsAgents,
      },
      { allowSms: true },
    );

    if (Object.keys(params).length === 0) {
      throwValidation(
        "No mutation flags provided. Pass at least one flag such as --nickname, --inbound-agent, --termination-uri, etc.",
      );
    }

    const client = getRetellClient();
    const pn = await client.phoneNumber.update(phoneNumber, params);

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

function throwValidation(message: string): never {
  const err = new Error(message);
  err.name = "ValidationError";
  throw err;
}
