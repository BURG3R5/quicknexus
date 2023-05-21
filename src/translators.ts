import { http } from "./dependencies.ts";

export function convertFromIncomingMessage(
  incomingMessage: http.IncomingMessage,
  secure: boolean,
): Request {
  // Get body
  let body = "";
  incomingMessage.on("data", (chunk: string) => {
    body += chunk;
  });

  // Get headers
  const incomingHttpHeaders = incomingMessage.headers;
  const headers: string[][] = [];
  for (const key in incomingHttpHeaders) {
    headers.push([key, incomingHttpHeaders[key] as string]);
  }

  // Get method and URL
  const method = incomingMessage.method;
  const url = new URL(
    (secure ? "http" : "https") + "://" + incomingHttpHeaders.host +
      incomingHttpHeaders.url,
  );

  return new Request(url, {
    headers,
    method,
    body: (method !== "GET" && method !== "HEAD")
      ? new TextEncoder().encode(body)
      : null,
  });
}

export async function writeToServerResponse(
  oakResponse: Response | undefined,
  serverResponse: http.ServerResponse,
): Promise<boolean> {
  if (typeof oakResponse === "undefined") {
    return false;
  }

  // Set status code
  serverResponse.statusCode = oakResponse.status;

  // Set headers
  const headers = oakResponse.headers;
  headers.forEach((value, name) => {
    serverResponse.setHeader(name, value);
  });

  // Set body
  const body = new Uint8Array(await oakResponse.arrayBuffer());
  serverResponse.setHeader("Content-Length", body.length.toString());
  serverResponse.write(body);

  serverResponse.end();
  return true;
}
