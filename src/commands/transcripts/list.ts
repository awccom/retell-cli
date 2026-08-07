/**
 * List Calls Command
 *
 * Lists call records through Retell's v3 list endpoint with filtering and
 * cursor/offset pagination. Use `transcripts get` for transcript-heavy fields.
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";
import {
  getPaginatedItems,
  withPaginationMetadata,
} from "../../services/paginated-response";
import { loadListFilter } from "../../services/list-filter";
import {
  parseNonNegativeIntegerFlag,
  parsePositiveIntegerFlag,
} from "../../services/numeric-flag";
import type { CallListParams } from "retell-sdk/resources/call";

export interface ListTranscriptsOptions {
  limit?: string;
  paginationKey?: string;
  sortOrder?: string;
  skip?: string;
  includeTotal?: boolean;
  filter?: string;
  filterFile?: string;
  fields?: string;
}

export async function listTranscriptsCommand(
  options: ListTranscriptsOptions = {},
): Promise<void> {
  try {
    if (options.skip !== undefined && options.paginationKey !== undefined) {
      throwValidation("--skip and --pagination-key cannot be used together");
    }

    const query: CallListParams = {
      limit: parsePositiveIntegerFlag(options.limit ?? "50", "--limit"),
    };

    if (options.paginationKey !== undefined) {
      query.pagination_key = options.paginationKey;
    }
    if (options.skip !== undefined) {
      query.skip = parseNonNegativeIntegerFlag(options.skip, "--skip");
    }
    if (options.sortOrder !== undefined) {
      if (!["ascending", "descending"].includes(options.sortOrder)) {
        throwValidation("--sort-order must be 'ascending' or 'descending'");
      }
      query.sort_order = options.sortOrder as "ascending" | "descending";
    }
    if (options.includeTotal) query.include_total = true;

    const filter = loadListFilter(options);
    if (filter) {
      query.filter_criteria = filter as CallListParams["filter_criteria"];
    }

    const client = getRetellClient();
    const response = await client.call.list(query);
    const calls = getPaginatedItems(response);
    const output = options.fields
      ? filterFields(
          calls,
          options.fields.split(",").map((field) => field.trim()),
        )
      : calls;

    outputJson(withPaginationMetadata(response, output));
  } catch (error) {
    handleSdkError(error);
  }
}

function throwValidation(message: string): never {
  const error = new Error(message);
  error.name = "ValidationError";
  throw error;
}
