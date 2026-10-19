import { describe, expect, it } from "vitest";
import { planExplanation } from "./explain";

describe("planExplanation", () => {
  it("does not describe topic ordering for topic-less plans", () => {
    expect(planExplanation(0)).not.toMatch(/topics are spread evenly/);
    expect(planExplanation(0)).toMatch(/^Generic template/);
  });
  it("explains topic ordering when topics were supplied", () => {
    expect(planExplanation(3)).toMatch(/topics are spread evenly in the order you listed them/);
  });
});
