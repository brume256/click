// deno-lint-ignore-file no-namespace

import { RpcRequest, RpcRequestInit, RpcRequestPreinit, RpcResponse, RpcResponseInit } from "@hazae41/jsonrpc";

declare global {

  export interface WindowEventMap {
    "pipe:request": CustomEvent<RpcRequestInit>
    "pipe:respond": CustomEvent<RpcResponseInit>
  }

}

declare global {

  export interface WindowEventMap {
    "pipe:requestSync": FormDataEvent
  }

}

declare global {

  export interface WindowEventMap {
    "pipe:message": CustomEvent<RpcRequestPreinit>
  }

}

export namespace pipe {

  export async function request<T>(init: RpcRequestPreinit) {
    using stack = new DisposableStack()

    const { method, params } = init

    const request = new RpcRequest(crypto.randomUUID(), method, params)

    const { promise, resolve, reject } = Promise.withResolvers<RpcResponse>()

    stack.defer(() => reject())
    promise.catch(() => { })

    const onRespond = (event: CustomEvent<RpcResponseInit>) => {
      const response = RpcResponse.from(event.detail)

      if (response.id !== request.id)
        return

      resolve(response)
    }

    addEventListener("pipe:respond", onRespond, { passive: true })
    stack.defer(() => removeEventListener("pipe:respond", onRespond))

    dispatchEvent(new CustomEvent("pipe:request", { detail: request }))

    const response = await promise

    return response.getOrThrow() as T
  }

  export function requestSync<T>(init: RpcRequestPreinit) {
    const { method, params } = init

    const rpcrequest = new RpcRequest(Date.now(), method, params)
    const rawrequest = JSON.stringify(rpcrequest)

    const formData = new FormData()
    formData.set("request", rawrequest)

    dispatchEvent(new FormDataEvent("pipe:requestSync", { formData }))

    const rawresponse = formData.get("response") as string
    const rpcresponse = RpcResponse.from<T>(JSON.parse(rawresponse))

    return rpcresponse.getOrThrow()
  }

}