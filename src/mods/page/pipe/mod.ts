// deno-lint-ignore-file no-namespace

import { RpcCounter, RpcRequest, RpcRequestPreinit, RpcResponse, RpcResponseInit } from "@hazae41/jsonrpc";

declare global {

  export interface WindowEventMap {
    "pipe:request": CustomEvent<RpcRequest<unknown>>
    "pipe:respond": CustomEvent<RpcResponse<unknown>>
  }

}

declare global {

  export interface WindowEventMap {
    "pipe:requestSync": FormDataEvent
  }

}

export namespace pipe {

  export const counter = new RpcCounter()

  export async function request<T>(init: RpcRequestPreinit<unknown>) {
    const cleaner = new AbortController()

    const request = counter.prepare(init)

    const { promise, resolve } = Promise.withResolvers<RpcResponseInit<T>>()

    addEventListener("pipe:respond", (event) => {
      const { detail: response } = event as CustomEvent<RpcResponse<T>>

      if (response.id !== request.id)
        return

      resolve(response)
    }, { passive: true, signal: cleaner.signal })

    dispatchEvent(new CustomEvent("pipe:request", { detail: request }))

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

    dispatchEvent(new FormDataEvent("pipe:requestSync", { formData }))

    const rawresponse = formData.get("response") as string
    const rpcresponse = RpcResponse.from<T>(JSON.parse(rawresponse))

    return rpcresponse.getOrThrow()
  }

}