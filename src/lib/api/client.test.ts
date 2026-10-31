import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, apiRequest } from "./client";

function mockFetch(response: Response | Error) {
  const fn = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("apiRequest", () => {
  it("unwraps the success envelope", async () => {
    const fetchFn = mockFetch(Response.json({ success: true, data: { ok: 1 } }));
    await expect(apiRequest<{ ok: number }>("/ping")).resolves.toEqual({ ok: 1 });
    expect(fetchFn).toHaveBeenCalledWith("/api/v1/ping", expect.objectContaining({ method: "GET" }));
  });

  it("throws ApiClientError with the backend error code", async () => {
    mockFetch(
      Response.json(
        { success: false, error: { code: "INSUFFICIENT_STOCK", message: "Only 2 left", details: [] } },
        { status: 409 },
      ),
    );
    await expect(apiRequest("/sales")).rejects.toMatchObject({
      name: "ApiClientError",
      code: "INSUFFICIENT_STOCK",
      status: 409,
      message: "Only 2 left",
    });
  });

  it("maps network failures to NETWORK_ERROR", async () => {
    mockFetch(new TypeError("Failed to fetch"));
    const error = (await apiRequest("/ping").catch((e: unknown) => e)) as ApiClientError;
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error.code).toBe("NETWORK_ERROR");
  });

  it("handles non-JSON responses", async () => {
    mockFetch(new Response("<html>bad gateway</html>", { status: 502 }));
    await expect(apiRequest("/ping")).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE", status: 502 });
  });

  it("sends FormData untouched and lets the browser set the multipart content type", async () => {
    const fetchFn = mockFetch(Response.json({ success: true, data: null }));
    const form = new FormData();
    form.append("file", new File(["a"], "a.csv"));
    await apiRequest("/upload", { method: "POST", body: form });
    const init = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(init[1].body).toBe(form);
    expect(init[1].headers as Record<string, string>).not.toHaveProperty("Content-Type");
  });

  it("sends JSON bodies with a content type", async () => {
    const fetchFn = mockFetch(Response.json({ success: true, data: null }));
    await apiRequest("/things", { method: "POST", body: { a: 1 } });
    const init = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(init[1].body).toBe('{"a":1}');
    expect((init[1].headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });
});
