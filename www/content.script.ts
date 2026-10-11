// deno-lint-ignore-file no-namespace require-await
/// <reference types="chrome" />

import { RpcErr, RpcError, RpcMessageInit, RpcMethodNotFoundError, RpcOk, RpcRequest, RpcRequestInit, RpcRequestPreinit, RpcResponse, RpcResponseInit } from "@hazae41/jsonrpc";

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
    const { method, params } = init

    const request = new RpcRequest(crypto.randomUUID(), method, params)

    const { promise, resolve } = Promise.withResolvers<RpcResponse>()

    const onMessage = (message: RpcMessageInit) => {
      if ("method" in message === true)
        return

      const response = RpcResponse.from(message)

      if (response.id !== request.id)
        return

      resolve(response)
    }

    port.onMessage.addListener(onMessage)

    port.postMessage(request)

    const response = await promise

    port.onMessage.removeListener(onMessage)

    return response.getOrThrow() as T
  }

  port.onMessage.addListener((message: RpcMessageInit) => {
    if ("method" in message === false)
      return

    const request = RpcRequest.from(message)

    if (request.method === "eth_accountsChanged")
      return frontend.message(request)
    if (request.method === "eth_chainChanged")
      return frontend.message(request)

    return
  })

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

    if (request.method === "chrome_url") {
      const [path] = request.params as [string]

      const url = chrome.runtime.getURL(path)

      return url
    }

    throw new RpcMethodNotFoundError()
  }

  export async function route(request: RpcRequest) {
    if (request.method === "eth_chainId")
      return "0x1"
    if (request.method === "eth_accounts")
      return await backend.request(request)
    if (request.method === "eth_requestAccounts")
      return await backend.request(request)
    if (request.method === "wallet_requestPermissions")
      return { parentCapability: "eth_accounts", caveats: [] }

    throw new RpcMethodNotFoundError()
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

      console.log("->", request)

      const response = new RpcOk(request.id, await route(request))

      console.log("<-", response)

      dispatchEvent(new CustomEvent("pipe:respond", { detail: response }))

      return
    } catch (error: unknown) {
      const request = RpcRequest.from(event.detail)

      const response = new RpcErr(request.id, RpcError.rewrap(error))

      console.log("<-", response)

      dispatchEvent(new CustomEvent("pipe:respond", { detail: response }))

      return
    }
  })

}