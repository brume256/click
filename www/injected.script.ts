// deno-lint-ignore-file no-namespace

import { RpcCounter, RpcRequest, RpcRequestPreinit, RpcResponse, RpcResponseInit } from "@hazae41/jsonrpc"
import { EventEmitter } from "events"

namespace brume {

  export const counter = new RpcCounter()

  export async function request<T>(init: RpcRequestPreinit<unknown>) {
    const cleaner = new AbortController()

    const request = counter.prepare(init)

    const { promise, resolve } = Promise.withResolvers<RpcResponseInit<T>>()

    addEventListener("brume:respond", (event) => {
      const { detail: response } = event as CustomEvent<RpcResponse<T>>

      if (response.id !== request.id)
        return

      resolve(response)
    }, { passive: true, signal: cleaner.signal })

    dispatchEvent(new CustomEvent("brume:request", { detail: request }))

    const response = RpcResponse.from<T>(await promise)

    cleaner.abort()

    return response.getOrThrow()
  }

  export function requestSync<T>(init: RpcRequestPreinit<unknown>) {
    const { method, params } = init

    const rpcrequest = new RpcRequest(null, method, params)
    const rawrequest = JSON.stringify(rpcrequest)

    const formData = new FormData()
    formData.set("request", rawrequest)

    dispatchEvent(new FormDataEvent("brume:requestSync", { formData }))

    const rawresponse = formData.get("response") as string
    const rpcresponse = RpcResponse.from<T>(JSON.parse(rawresponse))

    return rpcresponse.getOrThrow()
  }

}

interface EIP6963ProviderInfo {
  readonly uuid: string
  readonly name: string
  readonly icon: string
  readonly rdns: string
}

interface EIP6963ProviderDetail {
  readonly info: EIP6963ProviderInfo
  readonly provider: EIP1193Provider
}

interface EIP6963AnnounceProviderEvent extends CustomEvent {
  readonly type: "eip6963:announceProvider"
  readonly detail: EIP6963ProviderDetail
}

interface EIP6963RequestProviderEvent extends CustomEvent {
  readonly type: "eip6963:requestProvider"
}

declare global {

  interface WindowEventMap {
    "eip6963:announceProvider": EIP6963AnnounceProviderEvent
    "eip6963:requestProvider": EIP6963RequestProviderEvent
  }

}

class EIP1193Provider extends EventEmitter {

  constructor() {
    super()
  }

  async request<T>(init: RpcRequestPreinit<unknown>) {
    return await brume.request<T>(init)
  }

}

namespace eip6963 {

  export const info: EIP6963ProviderInfo = {
    uuid: "e60d639a-8479-4a9b-a7d6-ac4bd3957b13",
    name: "Brume Click",
    icon: brume.requestSync<string>({ method: "chrome_url", params: ["/padicon.png"] }),
    rdns: "tech.brume.click"
  }

  export function announce() {
    const detail: EIP6963ProviderDetail = { info, provider: new EIP1193Provider() }
    dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail }))
  }

  addEventListener("eip6963:requestProvider", () => {
    announce()
  }, { passive: true })

  announce()

}

interface WalletStandardWalletInfo {
  readonly version: string
  readonly name: string
  readonly icon: string
  readonly chains: string[]
  readonly features: Record<string, unknown>
  readonly accounts: unknown[]
}

interface WalletStandardApp {
  register(info: WalletStandardWalletInfo): void
}

declare global {

  interface WindowEventMap {
    "wallet-standard:app-ready": CustomEvent<WalletStandardApp>
    "wallet-standard:register-wallet": CustomEvent<(app: WalletStandardApp) => void>
  }

}

namespace wallet {

  const dummy = {
    address: "4kPAZS6jyqkotTAJB9eiPcLwhj483oQhVeMEaR7hamJS",
    publicKey: Uint8Array.fromHex("37b018ef756c14309a2c1bee7f3584793f0e3ce17e6d092de57660bb6e188b0b"),
    chains: ["solana:mainnet", "solana:devnet"],
    features: ["solana:signMessage", "solana:signTransaction"],
  }

  export const info: WalletStandardWalletInfo = {
    version: "1.0.0",
    name: "Brume Click",
    icon: brume.requestSync<string>({ method: "chrome_url", params: ["/padicon.png"] }),
    chains: ["solana:mainnet", "solana:devnet"],
    accounts: [dummy],
    features: {
      "standard:connect": {
        version: "1.0.0",
        connect: () => ({ accounts: [dummy] })
      },
      "standard:disconnect": {
        version: "1.0.0",
        disconnect: () => { },
      },
      "standard:events": {
        version: "1.0.0",
        on: () => { },
      },
      "solana:signMessage": {
        version: "1.0.0",
        signMessage: () => { throw new Error("Not implemented") },
      },
      "solana:signTransaction": {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0, 1],
        signTransaction: () => { throw new Error("Not implemented") },
      }
    }
  }

  export function announce() {
    const detail = (app: WalletStandardApp) => app.register(info)
    dispatchEvent(new CustomEvent("wallet-standard:register-wallet", { detail }))
  }

  addEventListener("wallet-standard:app-ready", (event) => {
    event.detail.register(info)
  }, { passive: true })

  announce()

}