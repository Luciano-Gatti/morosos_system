import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, refreshAccessToken } from "@/lib/apiClient";
import { authService } from "./authService";
import { clearStoredAuth, getStoredAccessToken, getStoredUser, persistSession } from "./authStorage";
import type { AuthUser } from "@/types/auth";

const user: AuthUser = { id: "u1", username: "admin", email: "a@test.com", nombre: "Admin", roles: [], permissions: ["OLD"], authVersion: 0 };
const refreshedUser = { ...user, permissions: ["NEW"], authVersion: 1 };
const refreshed = { accessToken: "new-token", refreshToken: "new-refresh", user: refreshedUser, tokenType: "Bearer", expiresIn: 900 };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => { clearStoredAuth(); persistSession("old-token", "old-refresh", user); });
afterEach(() => { clearStoredAuth(); vi.unstubAllGlobals(); });

describe("session renewal", () => {
  it("shares one refresh across management and administration, updates permissions and notifies React", async () => {
    const changed = vi.fn();
    window.addEventListener("morosos:auth:updated", changed);
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith("/auth/refresh")) return json(refreshed);
      if (new Headers(init.headers).get("Authorization") === "Bearer old-token") return json({}, 401);
      return json([]);
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      await Promise.all([apiClient.get("/inmuebles"), authService.adminUsers("old-token")]);
      expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("/auth/refresh"))).toHaveLength(1);
      expect(getStoredAccessToken()).toBe("new-token");
      expect(getStoredUser()?.permissions).toEqual(["NEW"]);
      expect(changed).toHaveBeenCalledTimes(1);
      await authService.adminRoles("old-token");
      expect(new Headers(fetchMock.mock.calls[fetchMock.mock.calls.length - 1][1].headers).get("Authorization")).toBe("Bearer new-token");
    } finally { window.removeEventListener("morosos:auth:updated", changed); }
  });

  it("does not restore a session cleared while renewal is in flight", async () => {
    let resolve: (response: Response) => void = () => {};
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((done) => { resolve = done; })));
    const pending = refreshAccessToken();
    clearStoredAuth();
    resolve(json(refreshed));
    expect(await pending).toBeNull();
    expect(getStoredAccessToken()).toBeNull();
  });

  it("administrative calls retry an expired token without requiring a management call first", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json(refreshed))
      .mockResolvedValueOnce(json([{ id: "u1" }]));
    vi.stubGlobal("fetch", fetchMock);
    expect(await authService.adminUsers("old-token")).toEqual([{ id: "u1" }]);
    expect(new Headers(fetchMock.mock.calls[2][1].headers).get("Authorization")).toBe("Bearer new-token");
  });
});
