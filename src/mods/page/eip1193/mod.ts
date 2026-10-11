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
      const { detail: message } = event

      if (message.method === "eth_accountsChanged") {
        const [accounts] = message.params as [string[]]

        this.emit("accountsChanged", accounts)

        return
      }

      if (message.method === "eth_chainChanged") {
        const [chainIdAsHex] = message.params as [string]

        this.emit("chainChanged", chainIdAsHex)

        return
      }

      if (message.method === "eth_message") {
        const [content] = message.params as [string]

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
