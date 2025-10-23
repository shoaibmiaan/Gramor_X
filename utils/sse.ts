// utils/sse.ts
// Lightweight SSE parser for streaming fetch responses.

export type SSEMessage = {
  event?: string | null;
  data: string;
};

/**
 * Consume a Response body formatted as text/event-stream and invoke the handler
 * for each dispatched message. Caller is responsible for aborting the fetch to
 * stop iteration.
 */
export async function consumeSSE(
  response: Response,
  onMessage: (message: SSEMessage) => void,
): Promise<void> {
  if (!response.body) {
    throw new Error('Response has no body to stream.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const processBuffer = () => {
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const trimmed = raw.trim();
      if (trimmed) {
        const lines = trimmed.split(/\r?\n/);
        let event: string | undefined;
        const dataParts: string[] = [];
        for (const line of lines) {
          if (line.startsWith('event:')) {
            event = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataParts.push(line.slice(5).trim());
          }
        }
        const data = dataParts.join('\n');
        if (data) {
          onMessage({ event: event ?? null, data });
        }
      }
      boundary = buffer.indexOf('\n\n');
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    processBuffer();
  }

  buffer += decoder.decode();
  processBuffer();
}

