// Shared lightweight Express request/response mocks and a fetch
// stub used by the voiceController test suites. Keeps tests dependency-free.

export function createRequest({ headers = {}, body = {}, params = {}, query = {} } = {}) {
  const lowerHeaders = {};
  for (const [key, value] of Object.entries(headers)) {
    lowerHeaders[key.toLowerCase()] = value;
  }
  return {
    body,
    params,
    query,
    get(name) {
      return lowerHeaders[String(name).toLowerCase()];
    },
    on() {
      // No-op: streamSpeech registers a "close" listener we do not exercise.
    }
  };
}

export function createResponse() {
  return {
    statusCode: 200,
    jsonBody: undefined,
    sentBody: undefined,
    headers: {},
    chunks: [],
    ended: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.jsonBody = payload;
      return this;
    },
    send(payload) {
      this.sentBody = payload;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    write(chunk) {
      this.chunks.push(chunk);
    },
    end() {
      this.ended = true;
    }
  };
}

// Returns a fetch stub that yields a single-chunk audio stream and records
// the upstream call so tests can assert on the request body.
export function createFetchStub({ ok = true, status = 200, chunk = "audio-bytes" } = {}) {
  const calls = [];
  const stub = async (url, options) => {
    calls.push({ url, options });
    if (!ok) {
      return {
        ok: false,
        status,
        async text() {
          return "upstream error";
        }
      };
    }
    let delivered = false;
    return {
      ok: true,
      status,
      body: {
        getReader() {
          return {
            async read() {
              if (delivered) {
                return { done: true, value: undefined };
              }
              delivered = true;
              return { done: false, value: Buffer.from(chunk) };
            },
            async cancel() {}
          };
        }
      }
    };
  };
  stub.calls = calls;
  return stub;
}

// Runs an async controller and waits for next(error) or completion.
export async function invoke(handler, request, response) {
  let captured;
  await handler(request, response, (error) => {
    captured = error;
  });
  return captured;
}
