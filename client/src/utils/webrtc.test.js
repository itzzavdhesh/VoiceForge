import { describe, it, expect, vi } from "vitest";
import { receiveDataInChunks } from "./webrtc";

describe("webrtc chunk receiver utility", () => {
  it("resets chunk buffers on metadata header and eof", () => {
    const mockChannel = { onmessage: null };
    const onComplete = vi.fn();

    receiveDataInChunks(mockChannel, onComplete);

    expect(typeof mockChannel.onmessage).toBe("function");

    // Send metadata header
    mockChannel.onmessage({ data: JSON.stringify({ type: "metadata", size: 100 }) });

    // Send array buffer chunk
    const chunk = new Uint8Array([123, 34, 116, 101, 115, 116, 34, 58, 49, 125]).buffer; // `{"test":1}`
    mockChannel.onmessage({ data: chunk });

    // Send EOF
    mockChannel.onmessage({ data: JSON.stringify({ type: "eof" }) });

    expect(onComplete).toHaveBeenCalledWith({ test: 1 });
  });
});
