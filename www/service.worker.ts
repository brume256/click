/// <reference types="chrome" />

import "@hazae41/worker-online-polyfill";

import { WcAccount } from "@/libs/account/mod.ts";
import { icon } from "@/libs/icon/mod.ts";
import { Nullable } from "@/libs/nullable/mod.ts";
import { RpcErr, RpcError, RpcInternalError, RpcInvalidRequestError, RpcMethodNotFoundError, RpcOk, RpcRequest, RpcRequestInit, RpcRequestPreinit } from "@hazae41/jsonrpc";
import { IrnClient, WalletConnect, WcChannel, WcInvalidMethodError, WcPairing, WcRequest, WcSession, WcSessionEventParams, WcSessionRequestParams, WcSessionSettleParams } from "@hazae41/latrine";

class WcAccountAndSession {

  readonly account: WcAccount

  #session: Nullable<WcSession> = null

  #closing = false

  constructor(account: WcAccount) {
    this.account = account
  }

  get session() {
    return this.#session
  }

  disconnect() {
    this.#closing = true

    this.session?.channel.client.close()

    return
  }

  async connect() {
    await using stack = new AsyncDisposableStack()

    let success = false

    console.debug("Opening session...")

    const { jwk, tpc, key } = this.account.details

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

    const onClose = () => {
      console.debug("Session closed")

      this.#session = null

      if (this.#closing)
        return

      this.connect().catch(console.warn)
    }

    session.addEventListener("event", (event) => onEvent(event.data), { signal: session.closing })
    session.addEventListener("request", (event) => event.respondWith(onRequest(event.data)), { signal: session.closing })
    session.addEventListener("close", onClose, { signal: session.closing })

    await session.open()

    console.debug("Session opened")

    success = true

    this.#session = session

    return session
  }

}

let current: Nullable<WcAccountAndSession> = null

let propose: Nullable<AbortController> = null

const scripts = new Set<chrome.runtime.Port>()

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

/**
 * Content script
 */

chrome.runtime.onConnect.addListener((script) => {
  const stack = new DisposableStack()

  const { sender } = script

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

  const subroute = async (chainId: `${string}:${string}`, request: WcRequest) => {
    const { method, params } = request

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

      return []
    }

    if (method === "personal_sign") {
      const _ = params

      if (current == null)
        throw new RpcInvalidRequestError()
      if (current.session == null)
        throw new RpcInternalError()

      return await current.session.request({ chainId, request })
    }

    if (method === "eth_signTypedData_v4") {
      const _ = params

      if (current == null)
        throw new RpcInvalidRequestError()
      if (current.session == null)
        throw new RpcInternalError()

      return await current.session.request({ chainId, request })
    }

    if (method === "eth_sendTransaction") {
      const _ = params

      if (current == null)
        throw new RpcInvalidRequestError()
      if (current.session == null)
        throw new RpcInternalError()

      return await current.session.request({ chainId, request })
    }

    if (method === "solana_connect") {
      const _ = params

      if (current != null)
        return [current.account.address.solana]

      return []
    }

    if (method === "solana_disconnect") {
      const _ = params

      Promise.try(() => script.postMessage({ method: "solana_disconnect" })).catch(() => { })

      return
    }

    if (method === "solana_signMessage") {
      const _ = params

      if (current == null)
        throw new RpcInvalidRequestError()
      if (current.session == null)
        throw new RpcInternalError()

      return await current.session.request({ chainId: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", request })
    }

    if (method === "solana_signTransaction") {
      const _ = params

      if (current == null)
        throw new RpcInvalidRequestError()
      if (current.session == null)
        throw new RpcInternalError()

      return await current.session.request({ chainId: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", request })
    }

    throw new RpcMethodNotFoundError()
  }

  const route = async (request: RpcRequestPreinit) => {
    const { method, params } = request

    if (method === "ping") {
      const _ = params

      // NOOP

      return
    }

    if (method === "wc_sessionRequest") {
      const { chainId, request } = params as WcSessionRequestParams

      // NOOP

      return await subroute(chainId, request)
    }

    throw new RpcMethodNotFoundError()
  }

  const onMessage = async (init: RpcRequestInit<WcSessionRequestParams>) => {
    try {
      const request = RpcRequest.from<WcSessionRequestParams>(init)

      if (request.method !== "ping")
        console.debug("->", request)

      const response = new RpcOk(request.id, await route(request))

      if (request.method !== "ping")
        console.debug("<-", response)

      Promise.try(() => script.postMessage(response)).catch(() => { })

      return
    } catch (error: unknown) {
      console.debug(error)

      const request = RpcRequest.from(init)

      const response = new RpcErr(request.id, RpcError.rewrap(error))

      console.debug("<-", response)

      Promise.try(() => script.postMessage(response)).catch(() => { })

      return
    }
  }

  const onDisconnect = () => {
    const error = chrome.runtime.lastError

    if (error != null)
      console.debug(error.message)

    stack.dispose()
  }

  script.onMessage.addListener(onMessage)
  script.onDisconnect.addListener(onDisconnect)

  stack.defer(() => script.onMessage.removeListener(onMessage))
  stack.defer(() => script.onDisconnect.removeListener(onDisconnect))

  scripts.add(script)
  stack.defer(() => scripts.delete(script))

  return
})

/**
 * Side panel
 */

chrome.runtime.onConnect.addListener((panel) => {
  const stack = new DisposableStack()

  if (panel.sender?.tab?.id != null)
    return

  const route = async (request: RpcRequest) => {
    const { method, params } = request

    if (method === "ping") {
      const _ = params

      // NOOP

      return
    }

    if (method === "wc_propose") {
      const [title, color] = params as [string, string]

      await using stack = new AsyncDisposableStack()

      let success = false

      const aborter = new AbortController()
      propose = aborter
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

      Promise.try(() => panel.postMessage({ method: "wc_pairingChanged", params: [pairing.url] })).catch(() => { })

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

      Promise.try(() => panel.postMessage({ method: "wc_accountsChanged", params: accounts })).catch(() => { })

      return
    }

    if (method === "wc_abandon") {
      const _ = params

      propose?.abort()

      return
    }

    if (method === "wc_accounts") {
      const _ = params

      const { accounts = [] } = await chrome.storage.local.get<{ accounts?: WcAccount[] }>("accounts")

      return accounts
    }

    if (method === "wc_delete") {
      const [account] = params as [WcAccount]

      if (account.uuid === current?.account.uuid)
        throw new RpcInvalidRequestError()

      const { accounts = [] } = await chrome.storage.local.get<{ accounts?: WcAccount[] }>("accounts")

      accounts.splice(accounts.findIndex(x => x.uuid === account.uuid), 1)

      await chrome.storage.local.set({ accounts })

      Promise.try(() => panel.postMessage({ method: "wc_accountsChanged", params: accounts })).catch(() => { })

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

      if (account.uuid === current?.account.uuid)
        return

      await chrome.storage.local.set({ account })

      current?.disconnect()

      current = new WcAccountAndSession(account)

      current.connect().catch(console.warn)

      for (const script of scripts) {
        Promise.try(() => script.postMessage({ method: "solana_connect", params: [account.address.solana] })).catch(() => { })
        Promise.try(() => script.postMessage({ method: "eth_accountsChanged", params: [account.address.eip155] })).catch(() => { })
      }

      Promise.try(() => panel.postMessage({ method: "wc_accountChanged", params: [account] })).catch(() => { })

      return
    }

    if (method === "wc_disconnect") {
      const _ = params

      await chrome.storage.local.set({ account: null })

      current?.disconnect()

      current = null

      for (const script of scripts) {
        Promise.try(() => script.postMessage({ method: "solana_disconnect", params: undefined })).catch(() => { })
        Promise.try(() => script.postMessage({ method: "eth_accountsChanged", params: [] })).catch(() => { })
      }

      Promise.try(() => panel.postMessage({ method: "wc_accountChanged", params: [] })).catch(() => { })

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

      Promise.try(() => panel.postMessage(response)).catch(() => { })

      return
    } catch (error: unknown) {
      console.debug(error)

      const request = RpcRequest.from(init)

      const response = new RpcErr(request.id, RpcError.rewrap(error))

      console.debug("<-", response)

      Promise.try(() => panel.postMessage(response)).catch(() => { })

      return
    }
  }

  const onDisconnect = () => {
    const error = chrome.runtime.lastError

    if (error != null)
      console.debug(error.message)

    stack.dispose()
  }

  panel.onMessage.addListener(onMessage)
  panel.onDisconnect.addListener(onDisconnect)

  stack.defer(() => panel.onMessage.removeListener(onMessage))
  stack.defer(() => panel.onDisconnect.removeListener(onDisconnect))

  return
})

Promise.try(async () => {
  const { account } = await chrome.storage.local.get<{ account: WcAccount }>("account")

  if (account == null)
    return

  current = new WcAccountAndSession(account)

  current.connect().catch(console.warn)
}).catch(console.error)

addEventListener("online", () => {
  if (current == null)
    return
  if (current.session != null)
    return
  current.connect().catch(console.warn)
}, { passive: true })