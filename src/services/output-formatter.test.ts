/**
 * Unit tests for output-formatter service
 *
 * Tests the filterFields() utility with various scenarios:
 * - Top-level field selection
 * - Nested field selection with dot notation
 * - Multiple fields selection
 * - Invalid field names
 * - Array handling
 * - Empty/null data handling
 */

import { describe, it, expect, vi } from "vitest";
import { filterFields } from "./output-formatter";

describe("filterFields", () => {
  describe("top-level field selection", () => {
    it("should filter simple object with single field", () => {
      const data = { name: "John", age: 30, email: "john@example.com" };
      const result = filterFields(data, ["name"]);

      expect(result).toEqual({ name: "John" });
    });

    it("should filter simple object with multiple fields", () => {
      const data = {
        name: "John",
        age: 30,
        email: "john@example.com",
        city: "NYC",
      };
      const result = filterFields(data, ["name", "age"]);

      expect(result).toEqual({ name: "John", age: 30 });
    });

    it("should preserve data types when filtering", () => {
      const data = {
        string: "hello",
        number: 42,
        boolean: true,
        null_value: null,
        array: [1, 2, 3],
        object: { nested: "value" },
      };
      const result = filterFields(data, [
        "string",
        "number",
        "boolean",
        "null_value",
        "array",
        "object",
      ]);

      expect(result).toEqual(data);
      expect(typeof result.string).toBe("string");
      expect(typeof result.number).toBe("number");
      expect(typeof result.boolean).toBe("boolean");
      expect(result.null_value).toBeNull();
      expect(Array.isArray(result.array)).toBe(true);
      expect(typeof result.object).toBe("object");
    });
  });

  describe("nested field selection with dot notation", () => {
    it("should filter nested object fields", () => {
      const data = {
        user: {
          profile: {
            name: "John",
            bio: "Software engineer",
          },
          id: 123,
        },
        metadata: {
          created: "2024-01-01",
        },
      };
      const result = filterFields(data, ["user.profile.name", "user.id"]);

      expect(result).toEqual({
        user: {
          profile: {
            name: "John",
          },
          id: 123,
        },
      });
    });

    it("should handle deeply nested fields", () => {
      const data = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: "deep",
              },
            },
          },
        },
      };
      const result = filterFields(data, ["level1.level2.level3.level4.value"]);

      expect(result).toEqual({
        level1: {
          level2: {
            level3: {
              level4: {
                value: "deep",
              },
            },
          },
        },
      });
    });

    it("should handle mixed top-level and nested fields", () => {
      const data = {
        id: 1,
        user: {
          name: "John",
          email: "john@example.com",
        },
        metadata: {
          created: "2024-01-01",
          updated: "2024-01-02",
        },
      };
      const result = filterFields(data, [
        "id",
        "user.name",
        "metadata.created",
      ]);

      expect(result).toEqual({
        id: 1,
        user: {
          name: "John",
        },
        metadata: {
          created: "2024-01-01",
        },
      });
    });
  });

  describe("array handling", () => {
    it("should filter array of objects with same fields", () => {
      const data = [
        { id: 1, name: "Alice", age: 25 },
        { id: 2, name: "Bob", age: 30 },
        { id: 3, name: "Charlie", age: 35 },
      ];
      const result = filterFields(data, ["name"]);

      expect(result).toEqual([
        { name: "Alice" },
        { name: "Bob" },
        { name: "Charlie" },
      ]);
    });

    it("should filter array of objects with nested fields", () => {
      const data = [
        { user: { name: "Alice", profile: { bio: "Engineer" } }, id: 1 },
        { user: { name: "Bob", profile: { bio: "Designer" } }, id: 2 },
      ];
      const result = filterFields(data, ["user.name", "id"]);

      expect(result).toEqual([
        { user: { name: "Alice" }, id: 1 },
        { user: { name: "Bob" }, id: 2 },
      ]);
    });

    it("should handle array within object", () => {
      const data = {
        users: [
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
        ],
        metadata: { count: 2 },
      };
      const result = filterFields(data, ["users", "metadata.count"]);

      expect(result).toEqual({
        users: [
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
        ],
        metadata: { count: 2 },
      });
    });

    it("should handle empty arrays", () => {
      const data: any[] = [];
      const result = filterFields(data, ["name"]);

      expect(result).toEqual([]);
    });
  });

  describe("invalid field handling", () => {
    it("should skip invalid field names in non-strict mode", () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const data = { name: "John", age: 30 };
      const result = filterFields(data, ["name", "nonexistent"]);

      expect(result).toEqual({ name: "John" });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Field 'nonexistent' not found in data"),
      );

      consoleWarnSpy.mockRestore();
    });

    it("should throw error for invalid fields in strict mode", () => {
      const data = { name: "John", age: 30 };

      expect(() => {
        filterFields(data, ["name", "nonexistent"], { strict: true });
      }).toThrow("Field 'nonexistent' not found in data");
    });

    it("should skip deeply nested invalid paths", () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const data = { user: { name: "John" } };
      const result = filterFields(data, ["user.name", "user.profile.bio"]);

      expect(result).toEqual({ user: { name: "John" } });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Field 'user.profile.bio' not found in data"),
      );

      consoleWarnSpy.mockRestore();
    });

    it("should handle multiple invalid fields", () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const data = { name: "John" };
      const result = filterFields(data, ["name", "invalid1", "invalid2"]);

      expect(result).toEqual({ name: "John" });

      consoleWarnSpy.mockRestore();
    });
  });

  describe("edge cases", () => {
    it("should handle null data", () => {
      const result = filterFields(null, ["name"]);
      expect(result).toBeNull();
    });

    it("should handle undefined data", () => {
      const result = filterFields(undefined, ["name"]);
      expect(result).toBeUndefined();
    });

    it("should handle empty object", () => {
      const result = filterFields({}, ["name"]);
      expect(result).toEqual({});
    });

    it("should handle empty fields array", () => {
      const data = { name: "John", age: 30 };
      const result = filterFields(data, []);
      expect(result).toEqual({});
    });

    it("should handle primitive data types", () => {
      expect(filterFields("string", ["field"])).toBe("string");
      expect(filterFields(123, ["field"])).toBe(123);
      expect(filterFields(true, ["field"])).toBe(true);
    });

    it("should handle objects with null values", () => {
      const data = { name: "John", age: null, email: "john@example.com" };
      const result = filterFields(data, ["name", "age"]);
      expect(result).toEqual({ name: "John", age: null });
    });

    it("should handle objects with undefined values", () => {
      const data = { name: "John", age: undefined, email: "john@example.com" };
      const result = filterFields(data, ["name", "age"]);
      expect(result).toEqual({ name: "John", age: undefined });
    });

    it("should correctly distinguish between undefined value and missing field", () => {
      const data = { name: "John", age: undefined, email: null };
      const result = filterFields(data, ["name", "age", "email"]);

      expect(result).toHaveProperty("age");
      expect(result.age).toBeUndefined();
      expect(result).toHaveProperty("email");
      expect(result.email).toBeNull();
      expect(result.name).toBe("John");
    });
  });

  describe("security - prototype pollution protection", () => {
    it("should reject __proto__ in field path", () => {
      const data = { user: { name: "John" } };

      expect(() => {
        filterFields(data, ["__proto__.polluted"], { strict: true });
      }).toThrow("Dangerous key detected");
    });

    it("should reject constructor in field path", () => {
      const data = { user: { name: "John" } };

      expect(() => {
        filterFields(data, ["user.constructor.polluted"], { strict: true });
      }).toThrow("Dangerous key detected");
    });

    it("should reject prototype in field path", () => {
      const data = { user: { name: "John" } };

      expect(() => {
        filterFields(data, ["prototype.polluted"], { strict: true });
      }).toThrow("Dangerous key detected");
    });

    it("should reject dangerous keys in nested paths", () => {
      const data = { user: { profile: { name: "John" } } };

      expect(() => {
        filterFields(data, ["user.__proto__.polluted"], { strict: true });
      }).toThrow("Dangerous key detected");
    });
  });

  describe("advanced edge cases", () => {
    it("should handle circular references gracefully", () => {
      const obj: any = { name: "test", id: 123 };
      obj.self = obj; // circular reference

      // Should not throw, and should filter the non-circular fields
      expect(() => filterFields(obj, ["name", "id"])).not.toThrow();
      const result = filterFields(obj, ["name", "id"]) as any;
      expect(result.name).toBe("test");
      expect(result.id).toBe(123);
    });

    it("should handle very deep nesting", () => {
      // Create a deeply nested object (50 levels)
      let deep: any = { value: "end" };
      for (let i = 0; i < 50; i++) {
        deep = { level: deep };
      }

      // Build the path string for 50 levels
      const path = Array(50).fill("level").join(".") + ".value";

      const result = filterFields(deep, [path]) as any;

      // Should successfully filter the deep path
      let current: any = result;
      for (let i = 0; i < 50; i++) {
        expect(current).toHaveProperty("level");
        current = current.level;
      }
      expect(current.value).toBe("end");
    });

    it("should handle unicode and special characters in keys", () => {
      const data = {
        名前: "John",
        "email@domain": "test@example.com",
        "field-with-dash": "value1",
        field_with_underscore: "value2",
      };

      const result = filterFields(data, ["名前", "field-with-dash"]);

      expect(result).toEqual({
        名前: "John",
        "field-with-dash": "value1",
      });
    });
  });

  describe("complex real-world scenarios", () => {
    it("should filter Retell API call object", () => {
      const callData = {
        call_id: "call_123",
        agent_id: "agent_456",
        call_status: "ended",
        start_timestamp: 1234567890,
        end_timestamp: 1234567900,
        transcript: "Long transcript...",
        transcript_object: [{ role: "agent", content: "Hello" }],
        metadata: {
          duration: 10,
          cost: 0.05,
        },
        recording_url: "https://...",
        public_log_url: "https://...",
      };

      const result = filterFields(callData, [
        "call_id",
        "call_status",
        "metadata.duration",
      ]);

      expect(result).toEqual({
        call_id: "call_123",
        call_status: "ended",
        metadata: {
          duration: 10,
        },
      });
    });

    it("should filter transcript array with nested fields", () => {
      const transcript = [
        {
          role: "agent",
          content: "Hello, how can I help?",
          words: [{ word: "Hello", start: 0, end: 0.5 }],
        },
        {
          role: "user",
          content: "I need help",
          words: [{ word: "I", start: 1, end: 1.2 }],
        },
      ];

      const result = filterFields(transcript, ["role", "content"]);

      expect(result).toEqual([
        { role: "agent", content: "Hello, how can I help?" },
        { role: "user", content: "I need help" },
      ]);
    });
  });
});
