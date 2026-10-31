import { vi } from "vitest";

/** A MediaRecorder stand-in: start() begins, stop() delivers `FakeRecorder.payload` and fires onstop. */
export class FakeRecorder {
  static payload: Blob | Uint8Array = new Uint8Array([1, 2, 3, 4]);
  static isTypeSupported = (type: string) => type === "audio/webm;codecs=opus" || type === "audio/webm";

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
  }

  start() {
    this.state = "recording";
  }

  stop() {
    if (this.state === "inactive") return;
    this.state = "inactive";
    const data = FakeRecorder.payload instanceof Blob ? FakeRecorder.payload : new Blob([FakeRecorder.payload as BlobPart], { type: this.mimeType });
    this.ondataavailable?.({ data });
    this.onstop?.();
  }
}

export const micTracks = [{ stop: vi.fn() }];
export const getUserMedia = vi.fn();

export function installFakeRecorder() {
  FakeRecorder.payload = new Uint8Array([1, 2, 3, 4]);
  micTracks.forEach((track) => track.stop.mockClear());
  getUserMedia.mockReset().mockResolvedValue({ getTracks: () => micTracks } as unknown as MediaStream);
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
}

export function removeFakeRecorder() {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "mediaDevices");
}
