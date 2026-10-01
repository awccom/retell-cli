import type Retell from "retell-sdk";

export type AgentVersionItem = Retell.AgentListVersionsResponse.Item;

const PAGE_LIMIT = 100;
const MAX_PAGES = 100;

/**
 * Fetch every stored version of a voice or chat agent.
 *
 * SDK 6 replaced `getVersions` with the paginated `agent.listVersions`
 * endpoint (`/list-agent-versions`), documented as serving both voice and
 * chat agents. Throws rather than returning a partial list if pagination
 * cannot be completed.
 */
export async function listAllAgentVersions(
  client: Retell,
  agentId: string,
): Promise<AgentVersionItem[]> {
  const items: AgentVersionItem[] = [];
  const seenKeys = new Set<string>();
  let paginationKey: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await client.agent.listVersions(agentId, {
      limit: PAGE_LIMIT,
      ...(paginationKey ? { pagination_key: paginationKey } : {}),
    });
    items.push(...(response.items ?? []));
    if (!response.has_more) return items;

    const nextKey = response.pagination_key;
    if (!nextKey) {
      throw new Error(
        "Incomplete version list: API reported more results without a pagination key",
      );
    }
    if (seenKeys.has(nextKey)) {
      throw new Error(
        "Incomplete version list: API returned a repeated pagination key",
      );
    }
    seenKeys.add(nextKey);
    paginationKey = nextKey;
  }

  throw new Error(
    `Incomplete version list: exceeded ${MAX_PAGES} pages of ${PAGE_LIMIT} versions`,
  );
}
