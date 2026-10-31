import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { DENIED_MESSAGE, UNSUPPORTED_MESSAGE, pickRecorderMimeType, useAudioRecorder } from "./useAudioRecorder";

class FakeRecorder {
  static instances: FakeRecorder[] = [];
  static supported = ["audio/webm;codecs=opus", "audio/webm"];
  static isTypeSupported = (type: string) => FakeRecorder.supported.includes(type);

  state: "inactive" | "recording" = "inactive";
  mimeType: string;
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(
    readonly stream: MediaStream,
    options?: { mimeType?: string },
  ) {
    this.mimeType = options?.mimeType ?? "";
    FakeRecorder.instances.push(this);
  }

  start() {
    this.state = "recording";
  }

  stop() {
    if (this.state === "inactive") return;
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["audio-bytes"], { type: this.mimeType }) });
    this.onstop?.();
  }
}

const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }];
const fakeStream = () => ({ getTracks: () => tracks }) as unknown as MediaStream;
const getUserMedia = vi.fn();

function renderRecorder(onComplete = vi.fn(), maxSeconds?: number) {
  const hook = renderHook(useAudioRecorder, { initialProps: { onComplete, maxSeconds } });
  return { ...hook, onComplete };
}

beforeEach(() => {
  FakeRecorder.instances = [];
  FakeRecorder.supported = ["audio/webm;codecs=opus", "audio/webm"];
  tracks.forEach((track) => track.stop.mockClear());
  getUserMedia.mockReset().mockResolvedValue(fakeStream());
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "mediaDevices");
});

describe("pickRecorderMimeType", () => {
  it("prefers webm/opus (Chrome) and falls back to mp4 (Safari)", () => {
    expect(pickRecorderMimeType()).toBe("audio/webm;codecs=opus");
    FakeRecorder.supported = ["audio/mp4"];
    expect(pickRecorderMimeType()).toBe("audio/mp4");
    FakeRecorder.supported = [];
    expect(pickRecorderMimeType()).toBeUndefined();
  });
});

describe("useAudioRecorder", () => {
  it("records, hands over the audio when stopped, and releases the microphone", async () => {
    const { result, onComplete } = renderRecorder();
    expect(result.current.status).toBe("idle");

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.status).toBe("recording");
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(FakeRecorder.instances[0].mimeType).toBe("audio/webm;codecs=opus");

    act(() => result.current.stop());
    expect(onComplete).toHaveBeenCalledTimes(1);
    const audio = onComplete.mock.calls[0][0] as { blob: Blob; mimeType: string };
    expect(audio.mimeType).toBe("audio/webm;codecs=opus");
    expect(audio.blob.size).toBeGreaterThan(0);
    expect(tracks[0].stop).toHaveBeenCalled();
    expect(tracks[1].stop).toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });

  it("uses mp4 when that is all the browser can record", async () => {
    FakeRecorder.supported = ["audio/mp4"];
    const { result, onComplete } = renderRecorder();
    await act(async () => {
      await result.current.start();
    });
    act(() => result.current.stop());
    expect((onComplete.mock.calls[0][0] as { mimeType: string }).mimeType).toBe("audio/mp4");
  });

  it("counts down and stops by itself at 30 seconds", async () => {
    vi.useFakeTimers();
    const { result, onComplete } = renderRecorder();
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.secondsLeft).toBe(30);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.secondsLeft).toBe(20);
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("idle");
    expect(tracks[0].stop).toHaveBeenCalled();
  });

  it("reports a blocked microphone", async () => {
    getUserMedia.mockRejectedValue(new DOMException("blocked", "NotAllowedError"));
    const { result, onComplete } = renderRecorder();
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.status).toBe("denied");
    expect(result.current.error).toBe(DENIED_MESSAGE);
    expect(FakeRecorder.instances).toHaveLength(0);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("reports a missing microphone", async () => {
    getUserMedia.mockRejectedValue(new DOMException("none", "NotFoundError"));
    const { result } = renderRecorder();
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatch(/No microphone/);
  });

  it("explains when the browser cannot record", async () => {
    Reflect.deleteProperty(navigator, "mediaDevices");
    const { result } = renderRecorder();
    expect(result.current.supported).toBe(false);
    expect(result.current.error).toBe(UNSUPPORTED_MESSAGE);
    await act(async () => {
      await result.current.start();
    });
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(result.current.status).toBe("error");
  });

  it("discards the recording and releases the microphone on cancel", async () => {
    const { result, onComplete } = renderRecorder();
    await act(async () => {
      await result.current.start();
    });
    act(() => result.current.cancel());
    expect(onComplete).not.toHaveBeenCalled();
    expect(tracks[0].stop).toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });

  it("releases the microphone when the page is left mid-recording", async () => {
    const { result, onComplete, unmount } = renderRecorder();
    await act(async () => {
      await result.current.start();
    });
    unmount();
    expect(tracks[0].stop).toHaveBeenCalled();
    expect(tracks[1].stop).toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("releases a stream that was granted after the component had gone", async () => {
    let grant: (stream: MediaStream) => void = () => {};
    getUserMedia.mockReturnValue(new Promise<MediaStream>((resolve) => (grant = resolve)));
    const { result, unmount } = renderRecorder();
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.start();
    });
    unmount();
    await act(async () => {
      grant(fakeStream());
      await pending;
    });
    expect(tracks[0].stop).toHaveBeenCalled();
    expect(FakeRecorder.instances).toHaveLength(0);
  });

  it("stops and reports when the recorder fails", async () => {
    const { result, onComplete } = renderRecorder();
    await act(async () => {
      await result.current.start();
    });
    act(() => FakeRecorder.instances[0].onerror?.());
    expect(result.current.status).toBe("error");
    expect(tracks[0].stop).toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });
});
