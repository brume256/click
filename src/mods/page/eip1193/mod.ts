// deno-lint-ignore-file no-namespace no-window

import { pipe } from "@/mods/page/pipe/mod.ts";
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

    addEventListener("pipe:message", (event) => {
      const { detail: request } = event

      if (request.method === "eth_accountsChanged") {
        const accounts = request.params as string[]

        this.emit("accountsChanged", accounts)

        return
      }

      if (request.method === "eth_chainChanged") {
        const [chainIdAsHex] = request.params as [string]

        this.emit("chainChanged", chainIdAsHex)

        return
      }

      if (request.method === "eth_message") {
        const [content] = request.params as [string]

        this.emit("message", content)

        return
      }

      return
    }, { passive: true })

    return
  }

  get isMetaMask() {
    return true
  }

  async request<T>(init: RpcRequestPreinit) {
    return await pipe.request<T>(init)
  }

}

export namespace ethereum {

  export const provider = new Ethereum()

  window.ethereum = provider

}
