/// <reference types="chrome" />
// deno-lint-ignore-file no-unused-vars

import { WalletConnectAccount } from "@/libs/account/mod.ts";
import { icon } from "@/libs/icon/mod.ts";
import { RpcErr, RpcError, RpcInvalidRequestError, RpcMethodNotFoundError, RpcOk, RpcRequest, RpcRequestInit } from "@hazae41/jsonrpc";
import { IrnClient, WalletConnect, WcChannel, WcInvalidMethodError, WcPairing, WcSession, WcSessionEventParams, WcSessionRequestParams, WcSessionSettleParams, WcUserRejectedRequestError } from "@hazae41/latrine";

const sessions = new Map<string, WcSession>()

const currents = new Map<string, WalletConnectAccount>()
const requests = new Map<string, PromiseWithResolvers<WalletConnectAccount>>()

const aborters = new Map<chrome.runtime.Port, AbortController>()
const channels = new Map<chrome.runtime.Port, string>()

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

  const route = async (request: RpcRequest) => {
    const { method, params } = request

    if (request.method === "ping")
      return

    if (request.method === "eth_chainId")
      return "0x1"

    if (request.method === "eth_accounts") {
      const current = currents.get(origin)

      if (current == null)
        return []

      return [current.address.eip155]
    }

    if (request.method === "eth_requestAccounts") {
      const current = currents.get(origin)

      if (current != null)
        return [current.address.eip155]

      const previous = requests.get(origin)

      if (previous != null)
        return await previous.promise

      using stack = new DisposableStack()

      const future = Promise.withResolvers<WalletConnectAccount>()

      requests.set(origin, future)
      stack.defer(() => requests.delete(origin))

      chrome.sidePanel.onClosed.addListener(future.reject)
      stack.defer(() => chrome.sidePanel.onClosed.removeListener(future.reject))

      await chrome.sidePanel.open({ windowId })

      const account = await future.promise

      return [account.address.eip155]
    }

    if (request.method === "personal_sign") {
      const current = currents.get(origin)

      if (current == null)
        throw new RpcInvalidRequestError()

      const session = sessions.get(current.uuid)

      if (session == null)
        throw new RpcInvalidRequestError()

      return await session.request({ chainId: "eip155:1", request: { method, params } })
    }

    if (request.method === "eth_sendTransaction") {
      const current = currents.get(origin)

      if (current == null)
        throw new RpcInvalidRequestError()

      const session = sessions.get(current.uuid)

      if (session == null)
        throw new RpcInvalidRequestError()

      return await session.request({ chainId: "eip155:1", request: { method, params } })
    }

    if (request.method === "eth_signTypedData_v4") {
      const current = currents.get(origin)

      if (current == null)
        throw new RpcInvalidRequestError()

      const session = sessions.get(current.uuid)

      if (session == null)
        throw new RpcInvalidRequestError()

      return await session.request({ chainId: "eip155:1", request: { method, params } })
    }

    if (request.method === "solana_connect") {
      const { onlyIfTrusted } = params as { onlyIfTrusted?: boolean }

      const current = currents.get(origin)

      if (current != null)
        return [current.address.solana]
      if (onlyIfTrusted)
        throw new WcUserRejectedRequestError()

      const previous = requests.get(origin)

      if (previous != null)
        return await previous.promise

      using stack = new DisposableStack()

      const future = Promise.withResolvers<WalletConnectAccount>()

      requests.set(origin, future)
      stack.defer(() => requests.delete(origin))

      chrome.sidePanel.onClosed.addListener(future.reject)
      stack.defer(() => chrome.sidePanel.onClosed.removeListener(future.reject))

      await chrome.sidePanel.open({ windowId })

      const account = await future.promise

      return [account.address.solana]
    }

    if (request.method === "solana_signMessage") {
      const current = currents.get(origin)

      if (current == null)
        throw new RpcInvalidRequestError()

      const session = sessions.get(current.uuid)

      if (session == null)
        throw new RpcInvalidRequestError()

      return await session.request({ chainId: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", request: { method, params } })
    }

    if (request.method === "solana_signTransaction") {
      const current = currents.get(origin)

      if (current == null)
        throw new RpcInvalidRequestError()

      const session = sessions.get(current.uuid)

      if (session == null)
        throw new RpcInvalidRequestError()

      return await session.request({ chainId: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", request: { method, params } })
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

      port.postMessage(response)

      return
    } catch (error: unknown) {
      console.debug(error)

      const request = RpcRequest.from(init)

      const response = new RpcErr(request.id, RpcError.rewrap(error))

      console.debug("<-", response)

      port.postMessage(response)

      return
    }
  }

  const onDisconnect = () => stack.dispose()

  port.onMessage.addListener(onMessage)
  port.onDisconnect.addListener(onDisconnect)

  stack.defer(() => port.onMessage.removeListener(onMessage))
  stack.defer(() => port.onDisconnect.removeListener(onDisconnect))

  channels.set(port, origin)
  stack.defer(() => channels.delete(port))

  return
})

/**
 * Side panel
 */

chrome.runtime.onConnect.addListener((port) => {
  const stack = new DisposableStack()

  if (port.sender?.tab?.id != null)
    return

  const route = async (request: RpcRequest) => {
    if (request.method === "ping")
      return

    if (request.method === "chrome_location") {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })

      if (tab.url == null)
        return

      return tab.url
    }

    if (request.method === "wc_propose") {
      const [title, color] = request.params as [string, string]

      await using stack = new AsyncDisposableStack()

      let success = false

      const aborter = new AbortController()
      aborters.set(port, aborter)
      const { signal } = aborter

      const cleaner = new AbortController()
      stack.defer(() => cleaner.abort())

      const self = {
        name: chrome.runtime.getManifest().name,
        description: chrome.runtime.getManifest().description!,
        url: chrome.runtime.getURL("/"),
        icons: [icon]
      }

      const requiredNamespaces = {
        eip155: {
          chains: ["eip155:1"],
          methods: ["personal_sign", "eth_sendTransaction", "eth_signTypedData_v4"],
          events: ["accountsChanged", "chainChanged"]
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

      await pairing.propose({ self, requiredNamespaces }, signal)

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

      success = true

      await session.close()

      const jwk = sticky.toBase64()
      const tpc = session.channel.topic
      const key = session.channel.key.toBase64()

      const { accounts = [] } = await chrome.storage.local.get<{ accounts?: WalletConnectAccount[] }>("accounts")

      const { eip155, solana } = namespaces as { eip155: { accounts: string[] }, solana: { accounts: string[] } }

      const eth = eip155.accounts[0].split(":")[2]
      const sol = solana.accounts[0].split(":")[2]

      accounts.push({ uuid: crypto.randomUUID(), type: "walletconnect", title, color, address: { eip155: eth, solana: sol }, details: { jwk, tpc, key } })

      await chrome.storage.local.set({ accounts })

      port.postMessage(new RpcRequest(crypto.randomUUID(), "wc_accountsChanged", accounts))

      return
    }

    if (request.method === "wc_abandon") {
      const _ = request.params

      aborters.get(port)?.abort()

      return
    }

    if (request.method === "wc_accounts") {
      const _ = request.params

      const { accounts = [] } = await chrome.storage.local.get<{ accounts?: WalletConnectAccount[] }>("accounts")

      return accounts
    }

    if (request.method === "wc_delete") {
      const [account] = request.params as [WalletConnectAccount]

      for (const [origin, account] of currents) {
        if (account.uuid === account.uuid)
          throw new RpcInvalidRequestError()
        else
          continue
      }

      const { accounts = [] } = await chrome.storage.local.get<{ accounts?: WalletConnectAccount[] }>("accounts")

      accounts.splice(accounts.findIndex(x => x.uuid === account.uuid), 1)

      await chrome.storage.local.set({ accounts })

      port.postMessage(new RpcRequest(crypto.randomUUID(), "wc_accountsChanged", accounts))

      return
    }

    if (request.method === "wc_account") {
      const [location] = request.params as [string]

      const { origin } = new URL(location)

      const current = currents.get(origin)

      if (current == null)
        return

      return current
    }

    if (request.method === "wc_connect") {
      const [location, account] = request.params as [string, WalletConnectAccount]

      const { origin } = new URL(location)

      const session = sessions.get(account.uuid)

      if (session == null) {
        await using stack = new AsyncDisposableStack()

        let success = false

        const { jwk, tpc, key } = account.details

        const sticky = Uint8Array.fromBase64(jwk)
        const client = await IrnClient.open(WalletConnect.RELAY, sticky, "c6c9bacd35afa3eb9e6cccf6d8464395")

        stack.defer(() => success ? undefined : client.close())

        const channel = new WcChannel(client, tpc, Uint8Array.fromBase64(key))
        const session = new WcSession(channel)

        const onEvent = (data: WcSessionEventParams) => {
          console.log("Session event:", data)

          return
        }

        const onRequest = (data: WcSessionRequestParams<unknown>) => {
          console.log("Session request:", data)

          throw new WcInvalidMethodError()
        }

        session.addEventListener("event", event => onEvent(event.data), { signal: session.closing })
        session.addEventListener("request", event => event.respondWith(onRequest(event.data)), { signal: session.closing })
        session.addEventListener("close", () => console.log("Session closed"), { signal: session.closing })

        await session.open()

        sessions.set(account.uuid, session)

        success = true
      }

      currents.set(origin, account)

      for (const channel of channels) {
        const [port, origin2] = channel

        if (origin2 !== origin)
          continue

        port.postMessage(new RpcRequest(crypto.randomUUID(), "solana_connect", [account.address.solana]))
        port.postMessage(new RpcRequest(crypto.randomUUID(), "eth_accountsChanged", [account.address.eip155]))
      }

      port.postMessage(new RpcRequest(crypto.randomUUID(), "wc_accountChanged", [account]))

      requests.get(origin)?.resolve(account)

      return
    }

    if (request.method === "wc_disconnect") {
      const [location] = request.params as [string]

      const { origin } = new URL(location)

      const current = currents.get(origin)

      if (current == null)
        throw new RpcInvalidRequestError()

      currents.delete(origin)

      for (const channel of channels) {
        const [port, origin2] = channel

        if (origin2 !== origin)
          continue

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

      port.postMessage(response)

      return
    } catch (error: unknown) {
      console.debug(error)

      const request = RpcRequest.from(init)

      const response = new RpcErr(request.id, RpcError.rewrap(error))

      console.debug("<-", response)

      port.postMessage(response)

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