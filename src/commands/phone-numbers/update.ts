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
import type { PhoneNumberUpdateParams } from "retell-sdk/resources/phone-number";

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
    const params: PhoneNumberUpdateParams = {};

    if (options.nickname !== undefined) params.nickname = options.nickname;
    if (options.terminationUri) params.termination_uri = options.terminationUri;
    if (options.sipUsername) params.auth_username = options.sipUsername;
    if (options.sipPassword) params.auth_password = options.sipPassword;
    if (options.transport) params.transport = options.transport;
    if (options.inboundWebhookUrl)
      params.inbound_webhook_url = options.inboundWebhookUrl;
    if (options.inboundSmsWebhookUrl)
      params.inbound_sms_webhook_url = options.inboundSmsWebhookUrl;
    if (options.fallbackNumber) params.fallback_number = options.fallbackNumber;
    if (options.allowedInboundCountryList)
      params.allowed_inbound_country_list = options.allowedInboundCountryList
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    if (options.allowedOutboundCountryList)
      params.allowed_outbound_country_list = options.allowedOutboundCountryList
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
