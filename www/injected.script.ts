// deno-lint-ignore-file no-namespace

import { RpcCounter, RpcRequest, RpcRequestPreinit, RpcResponse, RpcResponseInit } from "@hazae41/jsonrpc"
import { EventEmitter } from "events"

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

  interface DedicatedWorkerGlobalScopeEventMap {
    "eip6963:announceProvider": EIP6963AnnounceProviderEvent
    "eip6963:requestProvider": EIP6963RequestProviderEvent
  }

}

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

namespace ethereum {

  export const info: EIP6963ProviderInfo = {
    uuid: "e60d639a-8479-4a9b-a7d6-ac4bd3957b13",
    name: "Brume Click",
    icon: brume.requestSync<string>({ method: "chrome_url", params: ["/appicon.png"] }),
    rdns: "tech.brume"
  }

  export function announce() {
    addEventListener("eip6963:requestProvider", announce, { passive: true })

    const detail: EIP6963ProviderDetail = { info, provider: new EIP1193Provider() }

    dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail }))
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

ethereum.announce()