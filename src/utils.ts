import { AxiosResponse, RawAxiosRequestHeaders } from "./dependencies.ts";

export function isInteger(value: unknown): boolean {
  return (
    typeof value === "number" && isFinite(value) && Math.floor(value) === value
  );
}

export function validateInputAsPort(value: unknown): string {
  if (!isInteger(value)) {
    return "Invalid arguments: `port`, `lower-port-limit` and `upper-port-limit` must be integers";
  }

  const intValue = value as number;
  if (intValue < 1024 || intValue > 65_535) {
    return "Invalid arguments: `port`, `lower-port-limit` and `upper-port-limit` must be in the range [1024, 65536)";
  }

  return "";
}

export function removeItemOnce<T>(arr: T[], value: T): T[] {
  const index = arr.indexOf(value);
  if (index > -1) {
    arr.splice(index, 1);
  }
  return arr;
}

export function randomInRangeWithExclude(
  min: number,
  max: number,
  exclude: number[] = [],
): number {
  // a really clever solution from this Stack Overflow answer: https://stackoverflow.com/a/64910550
  let num = Math.floor(Math.random() * (max - min - exclude.length) + min);

  exclude
    .slice()
    .sort((a, b) => a - b)
    .every((e) => e <= num && (num++, true));

  return num;
}

export function castDenoHeadersToAxios(
  headers: Headers,
): RawAxiosRequestHeaders {
  const commonHeadersList = [
    "Accept",
    "Content-Length",
    "User-Agent",
    "Content-Encoding",
    "Authorization",
    "Content-Type",
  ];
  const object: RawAxiosRequestHeaders = {};

  commonHeadersList.forEach((commonHeader) => {
    object[commonHeader] = headers.get(commonHeader);
  });

  headers.forEach((value, key, _) => {
    object[key] = value;
  });

  return object;
}

function castAxiosHeadersToDeno(
  headers: Record<string, unknown>,
): string[][] {
  const list: string[][] = [];
  for (const key in headers) {
    list.push([key, headers[key] as string]);
  }
  return list;
}

export function castResponse(response: AxiosResponse): Response {
  console.log(response.data);

  return new Response(response.data, {
    headers: castAxiosHeadersToDeno(response.headers),
    status: response.status,
    statusText: response.statusText,
  });
}
