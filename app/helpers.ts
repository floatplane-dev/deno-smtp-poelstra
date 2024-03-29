import * as log from "https://deno.land/std@0.203.0/log/mod.ts";

export function response(status: number, _body: any, _headers?: any): Response {
  const body: string = JSON.stringify(_body);
  const headers: any = _headers || {
    "Access-Control-Allow-Origin": "*",
    "content-type": "application/json; charset=utf-8",
  };

  log.debug(`response: ${status} ${body}`);
  log.debug("------");

  return new Response(body, { status, headers });
}

export async function getJson(filePath: string) {
  return JSON.parse(await Deno.readTextFile(filePath));
}

export async function writeJson(filePath: string, o: any) {
  await Deno.writeTextFile(filePath, JSON.stringify(o));
}
