/**
 * Phone Numbers List Command
 *
 * Lists all phone numbers.
 * Usage: retell phone-numbers list
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import { parsePositiveIntegerFlag } from "../../services/numeric-flag";
import {
  getPaginatedItems,
  withPaginationMetadata,
} from "../../services/paginated-response";
import type { PhoneNumberListParams } from "retell-sdk/resources/phone-number";

export interface ListPhoneNumbersOptions {
  limit?: string;
  paginationKey?: string;
  sortOrder?: string;
  fields?: string;
}

/**
 * List all phone numbers
 *
 * @param options Command options
 */
export async function listPhoneNumbersCommand(
  options: ListPhoneNumbersOptions = {},
): Promise<void> {
  try {
    const client = getRetellClient();
    const query: PhoneNumberListParams = {};
    if (options.limit !== undefined) {
      query.limit = parsePositiveIntegerFlag(options.limit, "--limit");
    }
    if (options.paginationKey) query.pagination_key = options.paginationKey;
    if (options.sortOrder) {
      if (!["ascending", "descending"].includes(options.sortOrder)) {
        throwValidation("--sort-order must be 'ascending' or 'descending'");
      }
      query.sort_order = options.sortOrder as "ascending" | "descending";
    }

    const response = await client.phoneNumber.list(query);
    const phoneNumbers = getPaginatedItems(response);

    // Format for cleaner output
    const formatted = phoneNumbers.map((pn) => ({
      phone_number: pn.phone_number,
      phone_number_pretty: pn.phone_number_pretty,
      phone_number_type: pn.phone_number_type,
      nickname: pn.nickname,
      inbound_agents: pn.inbound_agents ?? [],
      outbound_agents: pn.outbound_agents ?? [],
    }));

    // Apply field filtering if requested
    const output = options.fields
      ? filterFields(
          formatted,
          options.fields.split(",").map((f) => f.trim()),
        )
      : formatted;

    outputJson(withPaginationMetadata(response, output));
  } catch (error) {
    handleSdkError(error);
  }
}

function throwValidation(message: string): never {
  const err = new Error(message);
  err.name = "ValidationError";
  throw err;
}
