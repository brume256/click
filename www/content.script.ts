// deno-lint-ignore-file no-namespace

/// <reference types="chrome" />

import { RpcErr, RpcError, RpcInvalidRequestError, RpcMessageInit, RpcMethodNotFoundError, RpcOk, RpcRequest, RpcRequestInit, RpcRequestPreinit, RpcResponse, RpcResponseInit } from "@hazae41/jsonrpc";

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

namespace backend {

  export const port = chrome.runtime.connect()

  export async function request<T>(init: RpcRequestPreinit) {
    using stack = new DisposableStack()

    const { method, params } = init

    const request = new RpcRequest(crypto.randomUUID(), method, params)

    const { promise, resolve, reject } = Promise.withResolvers<RpcResponse>()

    stack.defer(() => reject())
    promise.catch(() => { })

    const onMessage = (message: RpcMessageInit) => {
      if ("method" in message === true)
        return

      const response = RpcResponse.from(message)

      if (response.id !== request.id)
        return

      resolve(response)
    }

    port.onMessage.addListener(onMessage)
    stack.defer(() => port.onMessage.removeListener(onMessage))

    port.postMessage(request)

    const response = await promise

    return response.getOrThrow() as T
  }

  port.onMessage.addListener((message: RpcMessageInit) => {
    if ("method" in message === false)
      return

    const request = RpcRequest.from(message)

    frontend.message(request)

    return
  })

  const interval = setInterval(() => {
    request({ method: "ping" }).catch(() => clearInterval(interval))
  }, 1000)

}

namespace frontend {

  export function message(init: RpcRequestPreinit) {
    const { method, params } = init

    const request = new RpcRequest(crypto.randomUUID(), method, params)

    dispatchEvent(new CustomEvent("pipe:message", { detail: request }))
  }

  export function routeSync(request: RpcRequest) {
    if (request.method === "eip6963_uuid")
      return "e60d639a-8479-4a9b-a7d6-ac4bd3957b13"
    if (request.method === "eip6963_rdns")
      return "tech.brume.click"

    if (request.method === "chrome_name")
      return chrome.runtime.getManifest().name
    if (request.method === "chrome_version")
      return chrome.runtime.getManifest().version

    throw new RpcMethodNotFoundError()
  }

  export async function route(request: RpcRequest) {
    const { method } = request

    if (method === "eth_chainId")
      return await backend.request(request)
    if (method === "eth_accounts")
      return await backend.request(request)
    if (method === "eth_requestAccounts")
      return await backend.request(request)

    if (method === "solana_connect")
      return await backend.request(request)
    if (method === "solana_disconnect")
      return await backend.request(request)

    if (method === "personal_sign" && navigator.userActivation.isActive && confirm(`I want to sign a message`))
      return await backend.request(request)
    if (method === "eth_signTypedData_v4" && navigator.userActivation.isActive && confirm(`I want to sign a message`))
      return await backend.request(request)
    if (method === "eth_sendTransaction" && navigator.userActivation.isActive && confirm(`I want to sign a transaction`))
      return await backend.request(request)

    if (method === "solana_signMessage" && navigator.userActivation.isActive && confirm(`I want to sign a message`))
      return await backend.request(request)
    if (method === "solana_signTransaction" && navigator.userActivation.isActive && confirm(`I want to sign a transaction`))
      return await backend.request(request)

    throw new RpcInvalidRequestError()
  }

  addEventListener("pipe:requestSync", (event) => {
    try {
      const { formData } = event

      const rawrequest = formData.get("request") as string
      const rpcrequest = RpcRequest.from(JSON.parse(rawrequest))

      const rpcresponse = new RpcOk(null, routeSync(rpcrequest))
      const rawresponse = JSON.stringify(rpcresponse)

      formData.set("response", rawresponse)

      return
    } catch (error: unknown) {
      console.debug(error)

      const { formData } = event

      const rpcresponse = new RpcErr(null, RpcError.rewrap(error))
      const rawresponse = JSON.stringify(rpcresponse)

      formData.set("response", rawresponse)

      return
    }
  })

  addEventListener("pipe:request", async (event) => {
    try {
      const request = RpcRequest.from(event.detail)

      console.debug("->", request)

      const response = new RpcOk(request.id, await route(request))

      console.debug("<-", response)

      dispatchEvent(new CustomEvent("pipe:respond", { detail: response }))

      return
    } catch (error: unknown) {
      console.debug(error)

      const request = RpcRequest.from(event.detail)

      const response = new RpcErr(request.id, RpcError.rewrap(error))

      console.debug("<-", response)

      dispatchEvent(new CustomEvent("pipe:respond", { detail: response }))

      return
    }
  })

}