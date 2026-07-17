import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getDatabase: vi.fn(),
  saveProfile: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/client", () => ({
  DatabaseConfigurationError: class DatabaseConfigurationError extends Error {},
  getDatabase: mocks.getDatabase,
}));
vi.mock("@/lib/db/profiles", () => ({ saveProfile: mocks.saveProfile }));

import { DatabaseConfigurationError } from "@/lib/db/client";
import { POST } from "./route";

const validCreator = {
  role: "creator",
  displayName: "Kaia Chen",
  niche: "Skincare",
  followerCount: 96_200,
  engagementRateBasisPoints: 425,
  socials: ["https://instagram.com/kaia"],
  preferredLanguage: "zh-Hant",
} as const;

function request(body: unknown): Request {
  return new Request("http://localhost/api/onboarding/profile", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Given the onboarding profile route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("then rejects an unauthenticated write before touching storage", async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    const response = await POST(request(validCreator));

    expect(response.status).toBe(401);
    expect(mocks.saveProfile).not.toHaveBeenCalled();
  });

  it("then rejects malformed fields without persistence", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1" });

    const response = await POST(
      request({ ...validCreator, followerCount: 1.5 }),
    );
    const body: unknown = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      ok: false,
      fields: {
        followerCount: {
          en: "Follower count must be a whole number.",
        },
      },
    });
    expect(mocks.saveProfile).not.toHaveBeenCalled();
  });

  it("then rejects malformed JSON without persistence", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1" });
    const malformedRequest = new Request(
      "http://localhost/api/onboarding/profile",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      },
    );

    const response = await POST(malformedRequest);

    expect(response.status).toBe(400);
    expect(mocks.saveProfile).not.toHaveBeenCalled();
  });

  it("then persists with the authenticated Clerk identity", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_owner" });
    mocks.saveProfile.mockResolvedValue({
      role: "creator",
      displayName: "Kaia Chen",
      preferredLanguage: "zh-Hant",
    });

    const response = await POST(request(validCreator));
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.saveProfile).toHaveBeenCalledWith(
      expect.anything(),
      "user_owner",
      validCreator,
    );
    expect(body).toMatchObject({ ok: true });
  });

  it("then reports unavailable storage without exposing infrastructure", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1" });
    mocks.getDatabase.mockImplementation(() => {
      throw new DatabaseConfigurationError();
    });

    const response = await POST(request(validCreator));
    const body: unknown = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      message: { en: "Profile storage is not configured yet." },
    });
  });

  it("then returns a safe support reference for an unexpected failure", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1" });
    mocks.saveProfile.mockRejectedValue(new TypeError("provider detail"));
    const errorLog = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const response = await POST(request(validCreator));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      ok: false,
      message: {
        en: "We could not save the profile. Retry with the same details.",
      },
    });
    expect(body).toHaveProperty("correlationId");
    expect(JSON.stringify(body)).not.toContain("provider detail");
    expect(errorLog).toHaveBeenCalledWith(
      "profile_write_failed",
      expect.objectContaining({ errorName: "TypeError" }),
    );
  });
});
