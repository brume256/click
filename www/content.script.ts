// deno-lint-ignore-file no-namespace require-await
/// <reference types="chrome" />

import { RpcErr, RpcError, RpcMethodNotFoundError, RpcOk, RpcRequest } from "@hazae41/jsonrpc";

namespace brume {

  export function routeSync(request: RpcRequest) {
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
      return ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"]
    if (request.method === "eth_requestAccounts")
      return ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"]
    if (request.method === "wallet_requestPermissions")
      return { parentCapability: "eth_accounts", caveats: [] }

    throw new RpcMethodNotFoundError()
  }

  addEventListener("pipe:requestSync", (event) => {
    try {
      const { formData } = event as FormDataEvent

      const rawrequest = formData.get("request") as string
      const rpcrequest = RpcRequest.from(JSON.parse(rawrequest))

      console.debug("->", rpcrequest)

      const rpcresponse = new RpcOk(null, brume.routeSync(rpcrequest))
      const rawresponse = JSON.stringify(rpcresponse)

      console.debug("<-", rpcresponse)

      formData.set("response", rawresponse)

      return
    } catch (error: unknown) {
      const { formData } = event as FormDataEvent

      const rpcresponse = new RpcErr(null, RpcError.rewrap(error))
      const rawresponse = JSON.stringify(rpcresponse)

      console.debug("<-", rpcresponse)

      formData.set("response", rawresponse)

      return
    }
  })

  addEventListener("pipe:request", async (event) => {
    try {
      const { detail: request } = event as CustomEvent<RpcRequest>

      console.debug("->", request)

      const response = new RpcOk(request.id, await brume.route(request))

      console.debug("<-", response)

      dispatchEvent(new CustomEvent("pipe:respond", { detail: response }))

      return
    } catch (error: unknown) {
      const { detail: request } = event as CustomEvent<RpcRequest>

      const response = new RpcErr(request.id, RpcError.rewrap(error))

      console.debug("<-", response)

      dispatchEvent(new CustomEvent("pipe:respond", { detail: response }))

      return
    }
  })

}