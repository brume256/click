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
      const { detail } = event as CustomEvent<RpcRequestPreinit<unknown>>

      if (detail.method === "eth_accountsChanged") {
        const [accounts] = detail.params as [string[]]

        this.emit("accountsChanged", accounts)

        return
      }

      if (detail.method === "eth_chainChanged") {
        const [chainIdAsHex] = detail.params as [string]

        this.emit("chainChanged", chainIdAsHex)

        return
      }

      if (detail.method === "eth_message") {
        const [message] = detail.params as [string]

        this.emit("message", message)

        return
      }

      return
    }, { passive: true })

    return
  }

  get isMetaMask() {
    return true
  }

  async request<T>(init: RpcRequestPreinit<unknown>) {
    return await pipe.request<T>(init)
  }

}

export namespace ethereum {

  export const provider = new Ethereum()

  window.ethereum = provider

}
