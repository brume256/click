/// <reference types="chrome" />

import { WcAccount } from "@/libs/account/mod.ts";
import { chainlist } from "@/libs/chainlist/mod.ts";
import { icon } from "@/libs/icon/mod.ts";
import { Nullable } from "@/libs/nullable/mod.ts";
import { RpcErr, RpcError, RpcInternalError, RpcInvalidRequestError, RpcMethodNotFoundError, RpcOk, RpcRequest, RpcRequestInit, RpcResponse } from "@hazae41/jsonrpc";
import { IrnClient, WalletConnect, WcChannel, WcInvalidMethodError, WcPairing, WcSession, WcSessionEventParams, WcSessionRequestParams, WcSessionSettleParams } from "@hazae41/latrine";

class WcAccountAndSession {

  constructor(
    readonly account: WcAccount,
    readonly session: WcSession
  ) { }

}

let current: Nullable<WcAccountAndSession> = null
let waiting: Nullable<PromiseWithResolvers<WcAccountAndSession>> = null

const origins = new Map<chrome.runtime.Port, string>()

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

/**
 * Content script
 */

chrome.runtime.onConnect.addListener((port) => {
  const stack = new DisposableStack()

  const { sender } = port

  if (sender == null)
    return

  const { origin, tab } = sender

  if (origin == null)
    return
  if (tab == null)
    return

  const { windowId } = tab

  if (windowId == null)
    return

  let chainId = 1

  const route = async (request: RpcRequest) => {
    const { method, params } = request

    if (method === "ping")
      return

    if (method === "eth_chainId") {
      const _ = params

      // NOOP

      return `0x${chainId.toString(16)}`
    }

    if (method === "eth_call") {
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

    if (method === "eth_blockNumber") {
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

    if (method === "eth_getBalance") {
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

    if (method === "eth_estimateGas") {
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

    if (method === "eth_coinbase") {
      const _ = params

      if (current != null)
        return current.account.address.eip155

      return null
    }

    if (method === "eth_accounts") {
      const _ = params

      if (current != null)
        return [current.account.address.eip155]

      return []
    }

    if (method === "eth_requestAccounts") {
      const _ = params

      if (current != null)
        return [current.account.address.eip155]
      if (waiting != null)
        return await waiting.promise

      using stack = new DisposableStack()

      const future = Promise.withResolvers<WcAccountAndSession>()

      waiting = future
      stack.defer(() => waiting = null)

      await chrome.sidePanel.open({ windowId }).catch(() => { })

      chrome.sidePanel.onClosed.addListener(future.reject)
      stack.defer(() => chrome.sidePanel.onClosed.removeListener(future.reject))

      const resolved = await future.promise

      return [resolved.account.address.eip155]
    }

    if (method === "personal_sign") {
      const _ = params

      if (current == null)
        throw new RpcInvalidRequestError()

      return await current.session.request({ chainId: `eip155:${chainId}`, request: { method, params } })
    }

    if (method === "eth_signTypedData_v4") {
      const _ = params

      if (current == null)
        throw new RpcInvalidRequestError()

      return await current.session.request({ chainId: `eip155:${chainId}`, request: { method, params } })
    }

    if (method === "eth_sendTransaction") {
      const _ = params

      if (current == null)
        throw new RpcInvalidRequestError()

      return await current.session.request({ chainId: `eip155:${chainId}`, request: { method, params } })
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

    if (method === "solana_connect") {
      const _ = params

      if (current != null)
        return [current.account.address.solana]
      if (waiting != null)
        return await waiting.promise

      using stack = new DisposableStack()

      const future = Promise.withResolvers<WcAccountAndSession>()

      waiting = future
      stack.defer(() => waiting = null)

      chrome.sidePanel.onClosed.addListener(future.reject)
      stack.defer(() => chrome.sidePanel.onClosed.removeListener(future.reject))

      await chrome.sidePanel.open({ windowId })

      const resolved = await future.promise

      return [resolved.account.address.solana]
    }

    if (method === "solana_disconnect") {
      return port.postMessage(new RpcRequest(crypto.randomUUID(), "solana_disconnect", undefined))
    }

    if (method === "solana_signMessage") {
      const _ = params

      if (current == null)
        throw new RpcInvalidRequestError()

      return await current.session.request({ chainId: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", request: { method, params } })
    }

    if (method === "solana_signTransaction") {
      const _ = params

      if (current == null)
        throw new RpcInvalidRequestError()

      return await current.session.request({ chainId: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", request: { method, params } })
    }

    throw new RpcMethodNotFoundError()
  }

  const onMessage = async (init: RpcRequestInit) => {
    try {
      const request = RpcRequest.from(init)

      if (request.method !== "ping")
        console.debug("->", request)

      const response = new RpcOk(request.id, await route(request))

      if (request.method !== "ping")
        console.debug("<-", response)

      Promise.try(() => port.postMessage(response)).catch(() => { })

      return
    } catch (error: unknown) {
      console.debug(error)

      const request = RpcRequest.from(init)

      const response = new RpcErr(request.id, RpcError.rewrap(error))

      console.debug("<-", response)

      Promise.try(() => port.postMessage(response)).catch(() => { })

      return
    }
  }

  const onDisconnect = () => stack.dispose()

  port.onMessage.addListener(onMessage)
  port.onDisconnect.addListener(onDisconnect)

  stack.defer(() => port.onMessage.removeListener(onMessage))
  stack.defer(() => port.onDisconnect.removeListener(onDisconnect))

  origins.set(port, origin)
  stack.defer(() => origins.delete(port))

  return
})

/**
 * Side panel
 */

chrome.runtime.onConnect.addListener((port) => {
  const stack = new DisposableStack()

  if (port.sender?.tab?.id != null)
    return

  let proposal = new AbortController()

  const route = async (request: RpcRequest) => {
    const { method, params } = request

    if (method === "ping")
      return

    if (method === "chrome_location") {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })

      if (tab.url == null)
        return

      return tab.url
    }

    if (method === "wc_propose") {
      const [title, color] = params as [string, string]

      await using stack = new AsyncDisposableStack()

      let success = false

      const aborter = new AbortController()
      proposal = aborter
      const { signal } = aborter

      const cleaner = new AbortController()
      stack.defer(() => cleaner.abort())

      const self = {
        name: chrome.runtime.getManifest().name,
        description: chrome.runtime.getManifest().description!,
        url: chrome.runtime.getURL("/"),
        icons: [icon]
      }

      const optionalNamespaces = {
        eip155: {
          chains: ["eip155:1"],
          methods: ["personal_sign", "eth_signTypedData_v4", "eth_sendTransaction"],
          events: []
        },
        solana: {
          chains: ["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"],
          methods: ["solana_signMessage", "solana_signTransaction"],
          events: []
        }
      }

      const sticky = crypto.getRandomValues(new Uint8Array(32))
      const client = await IrnClient.open(WalletConnect.RELAY, sticky, "c6c9bacd35afa3eb9e6cccf6d8464395")

      stack.defer(() => success ? undefined : client.close())

      const pairing = await WcPairing.generate(client)

      port.postMessage(new RpcRequest(crypto.randomUUID(), "wc_pairingChanged", [pairing.url]))

      const upgraded = Promise.withResolvers<WcSession>()
      stack.defer(() => upgraded.reject())
      upgraded.promise.catch(() => { })

      pairing.addEventListener("upgrade", event => upgraded.resolve(event.data), { signal: cleaner.signal })
      pairing.addEventListener("close", upgraded.reject, { signal: cleaner.signal })
      signal.addEventListener("abort", upgraded.reject, { signal: cleaner.signal })

      await pairing.open()

      stack.defer(async () => await pairing.close())
      stack.defer(async () => await pairing.delete())

      await pairing.propose({ self, optionalNamespaces }, signal)

      const session = await upgraded.promise

      const settled = Promise.withResolvers<WcSessionSettleParams>()
      stack.defer(() => settled.reject())
      settled.promise.catch(() => { })

      session.addEventListener("settle", event => settled.resolve(event.data), { signal: cleaner.signal })
      session.addEventListener("close", settled.reject, { signal: cleaner.signal })
      signal.addEventListener("abort", settled.reject, { signal: cleaner.signal })

      await session.open()

      stack.defer(async () => success ? undefined : await session.close())
      stack.defer(async () => success ? undefined : await session.delete())

      const { namespaces } = await settled.promise

      console.debug("Session namespaces", namespaces)

      success = true

      await session.close()

      const jwk = sticky.toBase64()
      const tpc = session.channel.topic
      const key = session.channel.key.toBase64()

      const { accounts = [] } = await chrome.storage.local.get<{ accounts?: WcAccount[] }>("accounts")

      const { eip155, solana } = namespaces as { eip155: { accounts: string[] }, solana: { accounts: string[] } }

      const eth = eip155?.accounts?.[0]?.split(":")?.[2]
      const sol = solana?.accounts?.[0]?.split(":")?.[2]

      accounts.push({ uuid: crypto.randomUUID(), type: "walletconnect", title, color, address: { eip155: eth, solana: sol }, details: { jwk, tpc, key } })

      await chrome.storage.local.set({ accounts })

      port.postMessage(new RpcRequest(crypto.randomUUID(), "wc_accountsChanged", accounts))

      return
    }

    if (method === "wc_abandon") {
      const _ = params

      proposal.abort()

      return
    }

    if (method === "wc_accounts") {
      const _ = params

      const { accounts = [] } = await chrome.storage.local.get<{ accounts?: WcAccount[] }>("accounts")

      return accounts
    }

    if (method === "wc_delete") {
      const [account] = params as [WcAccount]

      if (current?.account.uuid === account.uuid)
        throw new RpcInvalidRequestError()

      const { accounts = [] } = await chrome.storage.local.get<{ accounts?: WcAccount[] }>("accounts")

      accounts.splice(accounts.findIndex(x => x.uuid === account.uuid), 1)

      await chrome.storage.local.set({ accounts })

      port.postMessage(new RpcRequest(crypto.randomUUID(), "wc_accountsChanged", accounts))

      return
    }

    if (method === "wc_account") {
      const _ = params

      if (current != null)
        return current.account

      return
    }

    if (method === "wc_connect") {
      const [account] = params as [WcAccount]

      if (current != null)
        throw new RpcInvalidRequestError()

      await using stack = new AsyncDisposableStack()

      let success = false

      const { jwk, tpc, key } = account.details

      const sticky = Uint8Array.fromBase64(jwk)
      const client = await IrnClient.open(WalletConnect.RELAY, sticky, "c6c9bacd35afa3eb9e6cccf6d8464395")

      stack.defer(() => success ? undefined : client.close())

      const channel = new WcChannel(client, tpc, Uint8Array.fromBase64(key))
      const session = new WcSession(channel)

      const onEvent = (data: WcSessionEventParams) => {
        console.debug("Session event", data)

        return
      }

      const onRequest = (data: WcSessionRequestParams<unknown>) => {
        console.debug("Session request", data)

        throw new WcInvalidMethodError()
      }

      session.addEventListener("event", event => onEvent(event.data), { signal: session.closing })
      session.addEventListener("request", event => event.respondWith(onRequest(event.data)), { signal: session.closing })
      session.addEventListener("close", () => console.debug("Session closed"), { signal: session.closing })

      await session.open()

      success = true

      current = new WcAccountAndSession(account, session)

      for (const [port] of origins) {
        port.postMessage(new RpcRequest(crypto.randomUUID(), "solana_connect", [account.address.solana]))
        port.postMessage(new RpcRequest(crypto.randomUUID(), "eth_accountsChanged", [account.address.eip155]))
      }

      port.postMessage(new RpcRequest(crypto.randomUUID(), "wc_accountChanged", [account]))

      waiting?.resolve(current)

      return
    }

    if (method === "wc_disconnect") {
      const _ = params

      await current?.session.close()

      current?.session.channel.client.close()

      current = null

      for (const [port] of origins) {
        port.postMessage(new RpcRequest(crypto.randomUUID(), "solana_disconnect", undefined))
        port.postMessage(new RpcRequest(crypto.randomUUID(), "eth_accountsChanged", []))
      }

      port.postMessage(new RpcRequest(crypto.randomUUID(), "wc_accountChanged", []))

      return
    }

    throw new RpcMethodNotFoundError()
  }

  const onMessage = async (init: RpcRequestInit) => {
    try {
      const request = RpcRequest.from(init)

      if (request.method !== "ping")
        console.debug("->", request)

      const response = new RpcOk(request.id, await route(request))

      if (request.method !== "ping")
        console.debug("<-", response)

      Promise.try(() => port.postMessage(response)).catch(() => { })

      return
    } catch (error: unknown) {
      console.debug(error)

      const request = RpcRequest.from(init)

      const response = new RpcErr(request.id, RpcError.rewrap(error))

      console.debug("<-", response)

      Promise.try(() => port.postMessage(response)).catch(() => { })

      return
    }
  }

  const onDisconnect = () => stack.dispose()

  port.onMessage.addListener(onMessage)
  port.onDisconnect.addListener(onDisconnect)

  stack.defer(() => port.onMessage.removeListener(onMessage))
  stack.defer(() => port.onDisconnect.removeListener(onDisconnect))

  const onActivated = async ({ tabId }: chrome.tabs.OnActivatedInfo) => {
    const tab = await chrome.tabs.get(tabId)

    if (!tab.active)
      return
    if (!tab.url)
      return

    port.postMessage(new RpcRequest(crypto.randomUUID(), "chrome_locationChanged", [tab.url]))
  }

  const onUpdated = async (tabId: number) => {
    const tab = await chrome.tabs.get(tabId)

    if (!tab.active)
      return
    if (!tab.url)
      return

    port.postMessage(new RpcRequest(crypto.randomUUID(), "chrome_locationChanged", [tab.url]))
  }

  chrome.tabs.onActivated.addListener(onActivated)
  chrome.tabs.onUpdated.addListener(onUpdated)

  stack.defer(() => chrome.tabs.onActivated.removeListener(onActivated))
  stack.defer(() => chrome.tabs.onUpdated.removeListener(onUpdated))

  return
})