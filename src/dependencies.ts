import EventEmitter from "node:events";
import http from "node:http";
import stream from "node:stream";

import Debug from "npm:debug@4.3.4";
import { hri } from "npm:human-readable-ids@1.0.4";
import pump from "npm:pump@3.0.0";
import { getSubdomain } from "npm:tldts@5.7.112";
import yargs from "npm:yargs@17.7.1";

import {
  Application as Oak,
  Context,
  Router,
  RouterContext,
  send,
} from "https://deno.land/x/oak@v12.1.0/mod.ts";
import logger from "https://deno.land/x/oak_logger@1.0.0/mod.ts";

export {
  Context,
  Debug,
  EventEmitter,
  getSubdomain,
  hri,
  http,
  logger,
  Oak,
  pump,
  Router,
  send,
  stream,
  yargs,
};

export type { RouterContext };
