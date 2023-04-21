import { Agent, ClientRequest, IncomingMessage } from "node:http";

import yargs from "npm:yargs@17.7.1";
import Debug from "npm:debug@4.3.4";
import { hri } from "npm:human-readable-ids@1.0.4";
import axios, {
  AxiosResponse,
  AxiosResponseHeaders,
  RawAxiosRequestHeaders,
} from "npm:axios@1.3.4";
import { getSubdomain } from "npm:tldts@5.7.112";

import { serve, Status } from "https://deno.land/std@0.178.0/http/mod.ts";
import { copyN } from "https://deno.land/std@0.178.0/io/mod.ts";

import {
  Application as Oak,
  Context,
  Router,
  RouterContext,
  send,
} from "https://deno.land/x/oak@v12.1.0/mod.ts";
import logger from "https://deno.land/x/oak_logger@1.0.0/mod.ts";
import {
  TCPClient,
  TCPEvents,
  TCPServer,
} from "https://deno.land/x/net@v1.1.2/src/mod.ts";

export {
  Agent,
  axios,
  ClientRequest,
  Context,
  copyN,
  Debug,
  getSubdomain,
  hri,
  IncomingMessage,
  logger,
  Oak,
  Router,
  send,
  serve,
  Status,
  TCPClient,
  TCPEvents,
  TCPServer,
  yargs,
};

export type {
  AxiosResponse,
  AxiosResponseHeaders,
  RawAxiosRequestHeaders,
  RouterContext,
};
