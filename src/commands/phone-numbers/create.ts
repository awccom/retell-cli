/**
 * Phone Numbers Create Command
 *
 * Purchases a new phone number and optionally binds agents.
 * Usage: retell phone-numbers create [--area-code <n>] [--country-code <US|CA>] [options]
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { applyWeightedAgents } from "../../services/weighted-agents";
import { parseNumericFlag } from "../../services/numeric-flag";
import type { PhoneNumberCreateParams } from "retell-sdk/resources/phone-number";

export interface CreatePhoneNumberOptions {
  countryCode?: string;
  areaCode?: string;
  numberProvider?: string;
  tollFree?: boolean;
  nickname?: string;
  phoneNumber?: string;
  inboundAgent?: string;
  outboundAgent?: string;
  inboundAgents?: string;
  outboundAgents?: string;
  inboundSmsAgents?: string;
  outboundSmsAgents?: string;
  allowedInboundCountryList?: string;
  allowedOutboundCountryList?: string;
  fallbackNumber?: string;
  inboundWebhookUrl?: string;
  transport?: string;
  fields?: string;
}

const VALID_COUNTRIES = ["US", "CA"] as const;
const VALID_PROVIDERS = ["twilio", "telnyx"] as const;
const VALID_TRANSPORTS = ["TLS", "TCP", "UDP"] as const;

export async function createPhoneNumberCommand(
  options: CreatePhoneNumberOptions = {},
): Promise<void> {
  try {
    if (
      options.countryCode &&
      !VALID_COUNTRIES.includes(options.countryCode as never)
    ) {
      throwValidation(
        `--country-code must be one of: ${VALID_COUNTRIES.join(", ")}`,
      );
    }
    if (
      options.numberProvider &&
      !VALID_PROVIDERS.includes(options.numberProvider as never)
    ) {
      throwValidation(
        `--number-provider must be one of: ${VALID_PROVIDERS.join(", ")}`,
      );
    }
    if (
      options.transport &&
      !VALID_TRANSPORTS.includes(options.transport as never)
    ) {
      throwValidation(
        `--transport must be one of: ${VALID_TRANSPORTS.join(", ")}`,
      );
    }

    const params: PhoneNumberCreateParams = {};

    if (options.countryCode)
      params.country_code = options.countryCode as "US" | "CA";
    if (options.areaCode !== undefined) {
      params.area_code = parseNumericFlag(options.areaCode, "--area-code");
    }
    if (options.numberProvider)
      params.number_provider = options.numberProvider as "twilio" | "telnyx";
    if (options.tollFree !== undefined) params.toll_free = options.tollFree;
    if (options.nickname) params.nickname = options.nickname;
    if (options.phoneNumber) params.phone_number = options.phoneNumber;
    if (options.fallbackNumber) params.fallback_number = options.fallbackNumber;
    if (options.inboundWebhookUrl)
      params.inbound_webhook_url = options.inboundWebhookUrl;
    if (options.transport) params.transport = options.transport;
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
      { allowSms: false },
    );

    const client = getRetellClient();
    const pn = await client.phoneNumber.create(params);

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
