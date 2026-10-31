import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Advisor, MESSAGE_MAX, SUGGESTED_QUESTIONS } from "./Advisor";
import { fail, mockApi, ok, renderWithProviders } from "@/test/utils";
import { getUserMedia, installFakeRecorder, micTracks, removeFakeRecorder } from "@/test/fakeRecorder";
import { aiStatusOff, aiStatusOk, chatReply } from "@/test/m5Fixtures";
import { ADVISOR_LANGUAGE_KEY } from "@/lib/ai/language";
import { AdvisorLanguageSettings } from "@/components/settings/AdvisorLanguageSettings";

class FakeAudio {
  static instances: FakeAudio[] = [];
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn(async () => {});
  pause = vi.fn();
  constructor(readonly src: string) {
    FakeAudio.instances.push(this);
  }
}

type Handler = Parameters<typeof mockApi>[0][string];

interface Calls {
  chat: Array<{ message: string; language?: string }>;
  speech: Array<{ text: string; language?: string }>;
  uploads: FormData[];
}

function setup(options: { status?: object; reply?: (call: number) => Response; routes?: Record<string, Handler> } = {}) {
  const calls: Calls = { chat: [], speech: [], uploads: [] };
  mockApi({
    "GET /api/v1/ai/status": () => ok(options.status ?? aiStatusOk),
    "POST /api/v1/ai/chat": ({ init }) => {
      calls.chat.push(JSON.parse(String(init.body)));
      return options.reply ? options.reply(calls.chat.length) : ok(chatReply());
    },
    "POST /api/v1/ai/voice/synthesize": ({ init }) => {
      calls.speech.push(JSON.parse(String(init.body)));
      return ok({ audioBase64: "QUJD", mimeType: "audio/wav", language: "en-IN" });
    },
    "POST /api/v1/ai/voice/transcribe": ({ init }) => {
      calls.uploads.push(init.body as FormData);
      return ok({ interactionId: "t-1", transcript: "aaj ki bikri kitni hui", languageCode: "hi-IN" });
    },
    ...options.routes,
  });
  renderWithProviders(<Advisor />);
  return calls;
}

const input = () => screen.getByLabelText("Your question");
const sendButton = () => screen.getByRole("button", { name: "Send question" });

async function ask(question: string) {
  await waitFor(() => expect(input()).toBeEnabled());
  await userEvent.type(input(), question);
  await userEvent.click(sendButton());
}

beforeEach(() => {
  window.localStorage.clear();
  FakeAudio.instances = [];
  vi.stubGlobal("Audio", FakeAudio);
  installFakeRecorder();
});

afterEach(() => removeFakeRecorder());

describe("Advisor — asking", () => {
  it("sends the question with the language and shows an AI answer with its source", async () => {
    const calls = setup();
    await ask("aaj ki bikri");

    expect(await screen.findByText("Today's sales are ₹12,480 across 18 bills.")).toBeInTheDocument();
    expect(calls.chat).toEqual([{ message: "aaj ki bikri", language: "en-IN" }]);
    expect(screen.getByText("aaj ki bikri")).toBeInTheDocument();
    expect(screen.getByText("AI (checked against your data)")).toBeInTheDocument();
    expect(input()).toHaveValue("");
  });

  it("shows records-only answers as such, with notes and an expandable Based on list", async () => {
    setup({
      reply: () =>
        ok(
          chatReply({
            source: "DATA",
            usedAi: false,
            notes: ["AI wording was not used because it could not be verified."],
            facts: [
              { label: "Sales amount (net of returns)", value: "₹12,480" },
              { label: "Bills", value: "18" },
            ],
          }),
        ),
    });
    await ask("sales");
    expect(await screen.findByText("From your records")).toBeInTheDocument();
    expect(screen.queryByText("AI (checked against your data)")).not.toBeInTheDocument();
    expect(screen.getByText("AI wording was not used because it could not be verified.")).toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: /Based on \(2\)/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Sales amount (net of returns)")).not.toBeInTheDocument();
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Sales amount (net of returns)")).toBeInTheDocument();
    expect(screen.getByText("₹12,480")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
  });

  it("shows profit and unsupported answers exactly as sent, with no facts and no retry", async () => {
    const calls = setup({
      reply: () =>
        ok(chatReply({ intent: "PROFIT", source: "DATA", usedAi: false, answer: "Profit is not tracked yet, so I cannot tell you.", facts: [] })),
    });
    await ask("profit kitna hua");
    expect(await screen.findByText("Profit is not tracked yet, so I cannot tell you.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Based on/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    expect(calls.chat).toHaveLength(1);
  });

  it("offers the suggested questions and sends one in a tap", async () => {
    const calls = setup();
    const chips = screen.getByRole("group", { name: "Suggested questions" });
    expect(within(chips).getAllByRole("button").map((b) => b.textContent)).toEqual([...SUGGESTED_QUESTIONS]);
    await waitFor(() => expect(within(chips).getByRole("button", { name: "Who owes me money?" })).toBeEnabled());
    await userEvent.click(within(chips).getByRole("button", { name: "Who owes me money?" }));
    await screen.findByText("Today's sales are ₹12,480 across 18 bills.");
    expect(calls.chat).toEqual([{ message: "Who owes me money?", language: "en-IN" }]);
  });

  it("limits the question to 300 characters and shows a counter", async () => {
    setup();
    await waitFor(() => expect(input()).toBeEnabled());
    expect(input()).toHaveAttribute("maxlength", String(MESSAGE_MAX));
    expect(screen.getByText("0/300")).toBeInTheDocument();
    await userEvent.type(input(), "hello");
    expect(screen.getByText("5/300")).toBeInTheDocument();
    expect(sendButton()).toBeEnabled();
  });

  it("clears the conversation", async () => {
    setup();
    await ask("sales");
    await screen.findByText("Today's sales are ₹12,480 across 18 bills.");
    await userEvent.click(screen.getByRole("button", { name: "New conversation" }));
    expect(screen.queryByText("Today's sales are ₹12,480 across 18 bills.")).not.toBeInTheDocument();
    expect(screen.getByText("Ask about your shop")).toBeInTheDocument();
  });
});

describe("Advisor — errors and availability", () => {
  it("shows the server's message and retries the same question once on request", async () => {
    const calls = setup({
      reply: (call) => (call === 1 ? fail(429, "RATE_LIMITED", "Too many questions. Wait a minute.") : ok(chatReply())),
    });
    await ask("sales");
    expect(await screen.findByText("Too many questions. Wait a minute.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Today's sales are ₹12,480 across 18 bills.")).toBeInTheDocument();
    expect(calls.chat).toHaveLength(2);
    expect(screen.queryByText("Too many questions. Wait a minute.")).not.toBeInTheDocument();
    expect(screen.getAllByText("sales")).toHaveLength(1);
  });

  it("uses friendly wording when a failure has no message", async () => {
    setup({ reply: () => fail(504, "UPSTREAM_TIMEOUT", "") });
    await ask("sales");
    expect(await screen.findByText(/took too long/)).toBeInTheDocument();
  });

  it("disables asking and the mic, with an honest message, when the server has no Sarvam key", async () => {
    const calls = setup({ status: aiStatusOff });
    expect(await screen.findByText("Voice and AI need the Sarvam API key on the server.")).toBeInTheDocument();
    expect(input()).toBeDisabled();
    expect(sendButton()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Speak your question" })).toBeDisabled();
    for (const chip of SUGGESTED_QUESTIONS) expect(screen.getByRole("button", { name: chip })).toBeDisabled();
    expect(calls.chat).toHaveLength(0);
  });

  it("keeps asking disabled until the status is known", () => {
    setup();
    expect(input()).toBeDisabled();
  });
});

describe("Advisor — language", () => {
  it("sends the chosen language and remembers it on this device", async () => {
    const calls = setup();
    await waitFor(() => expect(input()).toBeEnabled());
    await userEvent.selectOptions(screen.getByLabelText("Answer language"), "mr-IN");
    expect(window.localStorage.getItem(ADVISOR_LANGUAGE_KEY)).toBe("mr-IN");
    await ask("aaj");
    await screen.findByText("Today's sales are ₹12,480 across 18 bills.");
    expect(calls.chat[0].language).toBe("mr-IN");
  });

  it("starts from the remembered language", async () => {
    window.localStorage.setItem(ADVISOR_LANGUAGE_KEY, "hi-IN");
    setup();
    await waitFor(() => expect(screen.getByLabelText("Answer language")).toHaveValue("hi-IN"));
  });

  it("shares the choice with the Settings page", async () => {
    render(<AdvisorLanguageSettings />);
    await userEvent.click(screen.getByRole("radio", { name: "हिन्दी" }));
    expect(window.localStorage.getItem(ADVISOR_LANGUAGE_KEY)).toBe("hi-IN");
    expect(screen.getByRole("radio", { name: "हिन्दी" })).toBeChecked();
  });
});

describe("Advisor — listening", () => {
  it("fetches the audio on tap, plays it, and can stop it", async () => {
    const calls = setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "Today's sales" })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: "Today's sales" }));
    const listen = await screen.findByRole("button", { name: "Listen" });
    await waitFor(() => expect(listen).toBeEnabled());
    expect(FakeAudio.instances).toHaveLength(0);

    await userEvent.click(listen);
    expect(await screen.findByRole("button", { name: "Stop" })).toBeInTheDocument();
    expect(calls.speech).toEqual([{ text: "Today's sales are ₹12,480 across 18 bills.", language: "en-IN" }]);
    expect(FakeAudio.instances).toHaveLength(1);
    expect(FakeAudio.instances[0].src).toBe("data:audio/wav;base64,QUJD");
    expect(FakeAudio.instances[0].play).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(FakeAudio.instances[0].pause).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Listen" })).toBeInTheDocument();
  });

  it("returns to Listen when the audio finishes", async () => {
    setup();
    await ask("sales");
    await userEvent.click(await screen.findByRole("button", { name: "Listen" }));
    await screen.findByRole("button", { name: "Stop" });
    act(() => FakeAudio.instances[0].onended?.());
    expect(screen.getByRole("button", { name: "Listen" })).toBeInTheDocument();
  });

  it("shows a loading state while the audio is prepared", async () => {
    let release: (response: Response) => void = () => {};
    setup({
      routes: { "POST /api/v1/ai/voice/synthesize": () => new Promise<Response>((resolve) => (release = resolve)) },
    });
    await ask("sales");
    await userEvent.click(await screen.findByRole("button", { name: "Listen" }));
    expect(await screen.findByRole("button", { name: /Preparing audio/ })).toBeInTheDocument();
    await act(async () => release(ok({ audioBase64: "QUJD", mimeType: "audio/wav", language: "en-IN" })));
    expect(await screen.findByRole("button", { name: "Stop" })).toBeInTheDocument();
  });

  it("speaks in the chosen language", async () => {
    const calls = setup();
    await waitFor(() => expect(input()).toBeEnabled());
    await userEvent.selectOptions(screen.getByLabelText("Answer language"), "hi-IN");
    await ask("aaj");
    await userEvent.click(await screen.findByRole("button", { name: "Listen" }));
    await waitFor(() => expect(calls.speech[0]?.language).toBe("hi-IN"));
  });

  it("explains a listening failure on that answer only", async () => {
    setup({ routes: { "POST /api/v1/ai/voice/synthesize": () => fail(503, "AI_NOT_CONFIGURED", "Voice and AI need the Sarvam API key on the server.") } });
    await ask("sales");
    await userEvent.click(await screen.findByRole("button", { name: "Listen" }));
    expect(await screen.findAllByText("Voice and AI need the Sarvam API key on the server.")).not.toHaveLength(0);
    expect(FakeAudio.instances).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Listen" })).toBeEnabled();
  });

  it("disables Listen with a reason when speech output is not available", async () => {
    setup({ status: { configured: true, speech: true, chat: true, tts: false } });
    await ask("sales");
    const listen = await screen.findByRole("button", { name: "Listen" });
    expect(listen).toBeDisabled();
    expect(listen).toHaveAttribute("title", expect.stringContaining("Sarvam API key"));
  });
});

describe("Advisor — voice input", () => {
  it("transcribes into the box for the merchant to review, without sending", async () => {
    const calls = setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "Speak your question" })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: "Speak your question" }));
    expect(await screen.findByTestId("recording-countdown")).toHaveTextContent("0:30 left");
    await userEvent.click(screen.getByRole("button", { name: "Stop recording" }));

    await waitFor(() => expect(input()).toHaveValue("aaj ki bikri kitni hui"));
    expect(calls.chat).toHaveLength(0);
    expect(calls.uploads).toHaveLength(1);
    expect((calls.uploads[0].get("file") as File).name).toBe("voice.webm");
    expect(calls.uploads[0].get("language")).toBe("en-IN");
    expect(micTracks[0].stop).toHaveBeenCalled();
    expect(input()).toHaveFocus();
  });

  it("explains a blocked microphone", async () => {
    getUserMedia.mockRejectedValue(new DOMException("blocked", "NotAllowedError"));
    setup();
    await waitFor(() => expect(screen.getByRole("button", { name: "Speak your question" })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: "Speak your question" }));
    expect(await screen.findByText(/Microphone access is blocked/)).toBeInTheDocument();
  });

  it("shows why transcription failed and leaves the box alone", async () => {
    setup({ routes: { "POST /api/v1/ai/voice/transcribe": () => fail(415, "UNSUPPORTED_MEDIA_TYPE", "That is not an audio file.") } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Speak your question" })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: "Speak your question" }));
    await userEvent.click(await screen.findByRole("button", { name: "Stop recording" }));
    expect(await screen.findByText("That is not an audio file.")).toBeInTheDocument();
    expect(input()).toHaveValue("");
  });
});
