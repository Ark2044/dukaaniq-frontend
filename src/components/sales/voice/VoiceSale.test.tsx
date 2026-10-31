import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VoiceSale } from "./VoiceSale";
import { fail, mockApi, ok, page, renderWithProviders } from "@/test/utils";
import { FakeRecorder, getUserMedia, installFakeRecorder, micTracks, removeFakeRecorder } from "@/test/fakeRecorder";
import { aiStatusOff, aiStatusOk, draftLine, voiceDraft } from "@/test/m5Fixtures";
import { VOICE_LANGUAGE_KEY } from "@/lib/ai/language";
import { MAX_AUDIO_BYTES } from "@/lib/ai/audio";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/sales/voice" }));

type Handler = Parameters<typeof mockApi>[0][string];

function setup(routes: Record<string, Handler> = {}, status: object = aiStatusOk) {
  const uploads: FormData[] = [];
  const texts: Array<{ interactionId: string; transcript: string }> = [];
  mockApi({
    "GET /api/v1/ai/status": () => ok(status),
    "GET /api/v1/products": () => ok(page([])),
    "POST /api/v1/sales/voice/parse": ({ init }) => {
      uploads.push(init.body as FormData);
      return ok(voiceDraft());
    },
    "POST /api/v1/sales/voice/parse-text": ({ init }) => {
      const body = JSON.parse(String(init.body)) as { interactionId: string; transcript: string };
      texts.push(body);
      return ok(voiceDraft({ transcript: body.transcript, lines: [draftLine({ spokenName: "chai" })] }));
    },
    ...routes,
  });
  renderWithProviders(<VoiceSale />);
  return { uploads, texts };
}

const mic = () => screen.getByRole("button", { name: "Speak a sale" });

async function speak() {
  await waitFor(() => expect(mic()).toBeEnabled());
  await userEvent.click(mic());
  await userEvent.click(await screen.findByRole("button", { name: "Stop recording" }));
}

beforeEach(() => {
  window.localStorage.clear();
  installFakeRecorder();
});

afterEach(() => removeFakeRecorder());

describe("VoiceSale — recording and upload", () => {
  it("records, shows the countdown, uploads once with the language hint, then opens the review", async () => {
    const { uploads } = setup();
    await waitFor(() => expect(mic()).toBeEnabled());
    await userEvent.click(mic());
    expect(await screen.findByTestId("recording-countdown")).toHaveTextContent("0:30 left");
    expect(screen.getByText(/stops by itself after 30 seconds/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Stop recording" }));
    expect(await screen.findByText(/This is a draft, not a sale/)).toBeInTheDocument();
    expect(screen.getByLabelText("What we heard")).toHaveValue("2 kilo chini");

    expect(uploads).toHaveLength(1);
    const file = uploads[0].get("file") as File;
    expect(file.name).toBe("voice.webm");
    expect(file.size).toBeGreaterThan(0);
    expect(uploads[0].get("language")).toBe("unknown");
    expect(micTracks[0].stop).toHaveBeenCalled();
  });

  it("remembers the chosen language and sends it as the hint", async () => {
    const { uploads } = setup();
    await userEvent.selectOptions(screen.getByLabelText("Language you will speak"), "hi-IN");
    expect(window.localStorage.getItem(VOICE_LANGUAGE_KEY)).toBe("hi-IN");
    await speak();
    await screen.findByText(/This is a draft/);
    expect(uploads[0].get("language")).toBe("hi-IN");
  });

  it("always offers Type instead", () => {
    setup();
    expect(screen.getByRole("link", { name: "Type instead" })).toHaveAttribute("href", "/sales/new");
  });

  it("does not upload a recording over 5 MB", async () => {
    FakeRecorder.payload = new Uint8Array(MAX_AUDIO_BYTES + 1);
    const { uploads } = setup();
    await speak();
    expect(await screen.findByText(/too large \(over 5 MB\)/)).toBeInTheDocument();
    expect(uploads).toHaveLength(0);
    expect(micTracks[0].stop).toHaveBeenCalled();
  });

  it.each([
    [503, "AI_NOT_CONFIGURED", "Voice and AI need the Sarvam API key on the server."],
    [429, "RATE_LIMITED", "Please slow down a little."],
    [413, "PAYLOAD_TOO_LARGE", "The recording is bigger than 5 MB."],
    [415, "UNSUPPORTED_MEDIA_TYPE", "That file is not audio."],
    [502, "UPSTREAM_ERROR", "The speech service failed."],
    [504, "UPSTREAM_TIMEOUT", "The speech service took too long."],
    [400, "BAD_REQUEST", "Could not process the audio. Keep it under 30 seconds."],
  ])("shows the server's message for a %i failure and stays on the record screen", async (status, code, message) => {
    setup({ "POST /api/v1/sales/voice/parse": () => fail(status, code, message) });
    await speak();
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Speak a sale" })).toBeEnabled();
    expect(screen.queryByText(/This is a draft/)).not.toBeInTheDocument();
  });

  it("falls back to friendly wording when the server sends no message", async () => {
    setup({ "POST /api/v1/sales/voice/parse": () => fail(429, "RATE_LIMITED", "") });
    await speak();
    expect(await screen.findByText(/Too many requests right now/)).toBeInTheDocument();
  });
});

describe("VoiceSale — availability", () => {
  it("disables the mic and says why when the Sarvam key is not configured", async () => {
    setup({}, aiStatusOff);
    expect(await screen.findByText("Voice and AI need the Sarvam API key on the server.")).toBeInTheDocument();
    expect(mic()).toBeDisabled();
    expect(screen.getByRole("link", { name: "Type instead" })).toHaveAttribute("href", "/sales/new");
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("explains a blocked microphone and keeps typing available", async () => {
    getUserMedia.mockRejectedValue(new DOMException("blocked", "NotAllowedError"));
    setup();
    await waitFor(() => expect(mic()).toBeEnabled());
    await userEvent.click(mic());
    expect(await screen.findByText(/Microphone access is blocked/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Type instead" })).toBeInTheDocument();
  });

  it("explains when the browser cannot record", async () => {
    Reflect.deleteProperty(navigator, "mediaDevices");
    setup();
    expect(await screen.findByText(/Recording is not available in this browser/)).toBeInTheDocument();
    expect(mic()).toBeDisabled();
  });
});

describe("VoiceSale — re-check", () => {
  it("re-parses the edited transcript for the same draft and replaces the items", async () => {
    const { texts, uploads } = setup();
    await speak();
    const box = await screen.findByLabelText("What we heard");
    await userEvent.clear(box);
    await userEvent.type(box, "2 chai");
    await userEvent.click(screen.getByRole("button", { name: "Re-check" }));

    await waitFor(() => expect(texts).toEqual([{ interactionId: "d-1", transcript: "2 chai" }]));
    expect(await screen.findByRole("listitem", { name: "Item: Sugar" })).toBeInTheDocument();
    expect(screen.getByLabelText("What we heard")).toHaveValue("2 chai");
    expect(uploads).toHaveLength(1);
  });

  it("shows why a re-check failed and keeps the current draft", async () => {
    setup({ "POST /api/v1/sales/voice/parse-text": () => fail(409, "CONFLICT", "This draft was already used for a sale.") });
    await speak();
    await userEvent.type(await screen.findByLabelText("What we heard"), " more");
    await userEvent.click(screen.getByRole("button", { name: "Re-check" }));
    expect(await screen.findByText("This draft was already used for a sale.")).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "Item: Sugar" })).toBeInTheDocument();
  });
});
