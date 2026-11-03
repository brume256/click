// deno-lint-ignore-file no-namespace

/// <reference types="chrome" />

import { chainlist } from "@/libs/chainlist/mod.ts";
import { Channel } from "@/libs/channel/mod.ts";
import { RpcErr, RpcError, RpcInternalError, RpcInvalidRequestError, RpcMessageInit, RpcMethodNotFoundError, RpcOk, RpcRequest, RpcRequestInit, RpcRequestPreinit, RpcResponse, RpcResponseInit } from "@hazae41/jsonrpc";

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

let chainId = 1

namespace backend {

  export const channel = new Channel()

  export async function request<T>(request: RpcRequestPreinit) {
    const params = { chainId: `eip155:${chainId}`, request }
    return await channel.request<T>({ method: "wc_sessionRequest", params })
  }

  channel.addEventListener("message", (event: CustomEvent<RpcMessageInit>) => {
    const message = event.detail

    if ("method" in message === false)
      return

    const { method, params } = message

    frontend.message({ method, params })

    return
  })

}

namespace frontend {

  const permissions: Record<string, Record<string, unknown>> = {}

  export function message(message: RpcRequestPreinit) {
    const { method, params } = message

    const detail = { method, params }

    dispatchEvent(new CustomEvent("pipe:message", { detail }))
  }

  export function routeSync(request: RpcRequest) {
    const { method } = request

    if (method === "eip6963_uuid")
      return "e60d639a-8479-4a9b-a7d6-ac4bd3957b13"
    if (method === "eip6963_rdns")
      return "tech.brume.click"

    if (method === "chrome_name")
      return chrome.runtime.getManifest().name
    if (method === "chrome_version")
      return chrome.runtime.getManifest().version

    throw new RpcMethodNotFoundError()
  }

  export async function route(request: RpcRequest) {
    const { method, params } = request

    if (method === "eth_chainId") {
      const _ = params

      // NOOP

      return `0x${chainId.toString(16)}`
    }

    if (method === "eth_coinbase") {
      const _ = params

      if (permissions["eth_accounts"] == null)
        return null

      return await backend.request(request)
    }

    if (method === "eth_accounts") {
      const _ = params

      if (permissions["eth_accounts"] == null)
        return []

      return await backend.request(request)
    }

    if (method === "eth_requestAccounts") {
      const _ = params

      if (permissions["eth_accounts"] != null)
        return await backend.request(request)

      if (!confirm(`I want to access your crypto accounts`))
        throw new RpcInvalidRequestError()

      permissions["eth_accounts"] = {}

      return await backend.request(request)
    }

    if (method === "wallet_addEthereumChain") {
      const [_] = params as [{ chainId: string }]

      // NOOP

      return
    }

    if (method === "wallet_switchEthereumChain") {
      const [chain] = params as [{ chainId: string }]

      chainId = parseInt(chain.chainId, 16)

      return
    }

    if (method === "wallet_getPermissions") {
      const _ = params

      // NOOP

      return Object.entries(permissions).map(([key, value]) => ({ parentCapability: key, caveats: Object.entries(value).map(([type, value]) => ({ type, value })) }))
    }

    if (method === "wallet_requestPermissions") {
      const [requested] = params as [Record<string, Record<string, unknown>>]

      if (requested["eth_accounts"] == null)
        throw new RpcInvalidRequestError()

      if (!confirm(`I want to access your crypto accounts`))
        throw new RpcInvalidRequestError()

      permissions["eth_accounts"] = {}

      return Object.entries(permissions).map(([key, value]) => ({ parentCapability: key, caveats: Object.entries(value).map(([type, value]) => ({ type, value })) }))
    }

    if (method === "wallet_revokePermissions") {
      const [requested] = params as [Record<string, Record<string, unknown>>]

      if (requested["eth_accounts"] == null)
        throw new RpcInvalidRequestError()

      delete permissions["eth_accounts"]

      return Object.entries(permissions).map(([key, value]) => ({ parentCapability: key, caveats: Object.entries(value).map(([type, value]) => ({ type, value })) }))
    }

    if (method === "solana_connect") {
      const { onlyIfTrusted } = params as { onlyIfTrusted?: boolean }

      if (permissions["eth_accounts"] != null)
        return await backend.request(request)

      if (onlyIfTrusted)
        throw new RpcInvalidRequestError()
      if (!confirm(`I want to access your crypto accounts`))
        throw new RpcInvalidRequestError()

      permissions["eth_accounts"] = {}

      return await backend.request(request)
    }

    if (method === "solana_disconnect") {
      const _ = params

      // NOOP

      return await backend.request(request)
    }

    if (method === "personal_sign") {
      const _ = params

      if (!navigator.userActivation.isActive)
        throw new RpcInvalidRequestError()
      if (!confirm(`I want to sign a message`))
        throw new RpcInvalidRequestError()

      alert(`Open your wallet to sign the message`)

      return await backend.request(request)
    }

    if (method === "eth_signTypedData_v4") {
      const _ = params

      if (!navigator.userActivation.isActive)
        throw new RpcInvalidRequestError()
      if (!confirm(`I want to sign a message`))
        throw new RpcInvalidRequestError()

      alert(`Open your wallet to sign the message`)

      return await backend.request(request)
    }

    if (method === "eth_sendTransaction") {
      const _ = params

      if (!navigator.userActivation.isActive)
        throw new RpcInvalidRequestError()
      if (!confirm(`I want to sign a transaction`))
        throw new RpcInvalidRequestError()

      alert(`Open your wallet to sign the transaction`)

      return await backend.request(request)
    }

    if (method === "solana_signMessage") {
      const _ = params

      if (!navigator.userActivation.isActive)
        throw new RpcInvalidRequestError()
      if (!confirm(`I want to sign a message`))
        throw new RpcInvalidRequestError()

      alert(`Open your wallet to sign the message`)

      return await backend.request(request)
    }

    if (method === "solana_signTransaction") {
      const _ = params

      if (!navigator.userActivation.isActive)
        throw new RpcInvalidRequestError()
      if (!confirm(`I want to sign a transaction`))
        throw new RpcInvalidRequestError()

      alert(`Open your wallet to sign the transaction`)

      return await backend.request(request)
    }

    if (method.startsWith("eth_")) {
      const _ = params

      const chain = chainlist.find(x => x.chainId === chainId)

      if (chain == null)
        throw new RpcInvalidRequestError()

      const headers = { "Content-Type": "application/json" }

      const body = JSON.stringify(request)
      const http = await fetch(chain.rpc, { method: "POST", headers, body })

      if (!http.ok)
        throw new RpcInternalError()

      const json = await http.json()

      return RpcResponse.from(json).getOrThrow()
    }

    if (method === "web3_clientVersion") {
      const _ = params

      const version = chrome.runtime.getManifest().version

      return `BrumeClick/${version}`
    }

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