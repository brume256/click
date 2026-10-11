// deno-lint-ignore-file no-namespace no-window

import { brume } from "@/mods/page/brume/mod.ts";
import { RpcRequestPreinit } from "@hazae41/jsonrpc";
import { EventEmitter } from "events";

declare global {

  export interface Window {
    ethereum: Ethereum
  }

}

export class Ethereum extends EventEmitter {

  constructor() {
    super()
  }

  get isMetaMask() {
    return true
  }

  async request<T>(init: RpcRequestPreinit<unknown>) {
    return await brume.request<T>(init)
  }

}

export namespace ethereum {

  window.ethereum = new Ethereum()

}
