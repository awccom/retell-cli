import { describe, it, expect } from "vitest";
import { hashFlowPrompts, hashLlmPrompts } from "./prompt-hash";

describe("hashLlmPrompts", () => {
  it("is stable for equal content", () => {
    const a = hashLlmPrompts({
      general_prompt: "Hi",
      states: [{ name: "s", state_prompt: "p" }],
    });
    const b = hashLlmPrompts({
      general_prompt: "Hi",
      states: [{ name: "s", state_prompt: "p" }],
    });
    expect(a).toBe(b);
  });

  it("treats missing and empty optional fields the same", () => {
    expect(hashLlmPrompts({ general_prompt: "Hi" })).toBe(
      hashLlmPrompts({ general_prompt: "Hi", begin_message: null, states: [] }),
    );
  });

  it("ignores fields the CLI does not manage", () => {
    const withExtras = {
      general_prompt: "Hi",
      states: [{ name: "s", state_prompt: "p", edges: [{ x: 1 }] }],
    } as any;
    expect(hashLlmPrompts(withExtras)).toBe(
      hashLlmPrompts({
        general_prompt: "Hi",
        states: [{ name: "s", state_prompt: "p" }],
      }),
    );
  });

  it("changes when prompt text changes", () => {
    expect(hashLlmPrompts({ general_prompt: "Hi" })).not.toBe(
      hashLlmPrompts({ general_prompt: "Hello" }),
    );
    expect(hashLlmPrompts({ general_prompt: "Hi" })).not.toBe(
      hashLlmPrompts({ general_prompt: "Hi", begin_message: "Welcome" }),
    );
  });
});

describe("hashFlowPrompts", () => {
  it("is independent of object key order", () => {
    expect(
      hashFlowPrompts({ global_prompt: "G", nodes: [{ id: "a", type: "x" }] }),
    ).toBe(
      hashFlowPrompts({ global_prompt: "G", nodes: [{ type: "x", id: "a" }] }),
    );
  });

  it("changes when a node changes", () => {
    expect(
      hashFlowPrompts({ global_prompt: "G", nodes: [{ id: "a", text: "1" }] }),
    ).not.toBe(
      hashFlowPrompts({ global_prompt: "G", nodes: [{ id: "a", text: "2" }] }),
    );
  });
});
