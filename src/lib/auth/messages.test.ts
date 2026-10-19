import { describe, expect, it } from "vitest";
import { loginErrorMessage, RATE_LIMIT_MESSAGE, signupErrorMessage } from "./messages";

describe("auth error messages", () => {
  it("maps 429 to a friendly wait message", () => {
    expect(loginErrorMessage({ status: 429 })).toBe(RATE_LIMIT_MESSAGE);
    expect(signupErrorMessage({ status: 429, code: "over_request_rate_limit" })).toBe(RATE_LIMIT_MESSAGE);
  });
  it("keeps wrong-password errors neutral", () => {
    const msg = loginErrorMessage({ status: 400, code: "invalid_credentials", message: "Invalid login credentials" });
    expect(msg).not.toMatch(/exist|not found|no account/i);
  });
  it("explains duplicate signups", () => {
    expect(signupErrorMessage({ status: 422, code: "user_already_exists" })).toMatch(/already exists/);
  });
});
