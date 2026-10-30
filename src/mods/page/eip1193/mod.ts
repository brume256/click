// deno-lint-ignore-file no-namespace no-window

import { pipe } from "@/mods/page/pipe/mod.ts";
import { RpcMethodNotFoundError, RpcRequestPreinit } from "@hazae41/jsonrpc";
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
      const { method, params } = request

      if (method === "eth_accountsChanged") {
        const accounts = params as string[]

        this.emit("accountsChanged", accounts)

        return
      }

      if (method === "eth_chainChanged") {
        const [chainIdAsHex] = params as [string]

        this.emit("chainChanged", chainIdAsHex)

        return
      }

      if (method === "eth_message") {
        const [content] = params as [string]

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
    const { method } = init

    if (method === "eth_chainId")
      return await pipe.request<T>(init)
    if (method === "eth_accounts")
      return await pipe.request<T>(init)
    if (method === "eth_requestAccounts")
      return await pipe.request<T>(init)

    if (method === "wallet_addEthereumChain")
      return await pipe.request<T>(init)
    if (method === "wallet_switchEthereumChain")
      return await pipe.request<T>(init)

    if (method === "wallet_getPermissions")
      return await pipe.request<T>(init)
    if (method === "wallet_requestPermissions")
      return await pipe.request<T>(init)
    if (method === "wallet_revokePermissions")
      return await pipe.request<T>(init)

    if (method === "personal_sign")
      return await pipe.request<T>(init)
    if (method === "eth_sendTransaction")
      return await pipe.request<T>(init)
    if (method === "eth_signTypedData_v4")
      return await pipe.request<T>(init)

    throw new RpcMethodNotFoundError()
  }

}

export namespace eip1193 {

  export const provider = new Ethereum()

  window.ethereum = provider

}
