import { describe, it, expect, vi } from "vitest";
import { listAllAgentVersions } from "./agent-versions";

function clientWith(...pages: unknown[]) {
  const listVersions = vi.fn();
  for (const page of pages) listVersions.mockResolvedValueOnce(page);
  return { client: { agent: { listVersions } } as any, listVersions };
}

describe("listAllAgentVersions", () => {
  it("collects items across pages until has_more is false", async () => {
    const { client, listVersions } = clientWith(
      { has_more: true, pagination_key: "k1", items: [{ version: 2 }] },
      { has_more: false, items: [{ version: 1 }] },
    );

    const items = await listAllAgentVersions(client, "agent_1");

    expect(items.map((i) => i.version)).toEqual([2, 1]);
    expect(listVersions).toHaveBeenNthCalledWith(2, "agent_1", {
      limit: 100,
      pagination_key: "k1",
    });
  });

  it("throws when more results are reported without a pagination key", async () => {
    const { client } = clientWith({ has_more: true, items: [] });
    await expect(listAllAgentVersions(client, "agent_1")).rejects.toThrow(
      "without a pagination key",
    );
  });

  it("throws on a repeated pagination key", async () => {
    const { client } = clientWith(
      { has_more: true, pagination_key: "k1", items: [] },
      { has_more: true, pagination_key: "k1", items: [] },
    );
    await expect(listAllAgentVersions(client, "agent_1")).rejects.toThrow(
      "repeated pagination key",
    );
  });

  it("throws instead of truncating when the page cap is reached", async () => {
    let n = 0;
    const listVersions = vi.fn(async () => ({
      has_more: true,
      pagination_key: `k${n++}`,
      items: [],
    }));
    await expect(
      listAllAgentVersions({ agent: { listVersions } } as any, "agent_1"),
    ).rejects.toThrow("exceeded 100 pages");
    expect(listVersions).toHaveBeenCalledTimes(100);
  });
});
