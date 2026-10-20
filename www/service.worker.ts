/// <reference types="chrome" />
// deno-lint-ignore-file no-empty-pattern

import { Nullable } from "@/libs/nullable/mod.ts";
import { RpcErr, RpcError, RpcMethodNotFoundError, RpcOk, RpcRequest, RpcRequestInit } from "@hazae41/jsonrpc";
import { IrnClient, WalletConnect, WcPairing, WcSession, WcSessionSettleParams } from "@hazae41/latrine";

interface Addresses {
  readonly eth: string
  readonly sol: string
}

interface Account {
  readonly title: string
  readonly addrs: Addresses
  readonly color: Nullable<string>
}

const accounts = new Map<string, Account>()
const requests = new Map<string, PromiseWithResolvers<Account>>()

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
    if (request.method === "ping")
      return

    if (request.method === "eth_accounts") {
      const account = accounts.get(origin)

      if (account != null)
        return [account.addrs.eth]

      return []
    }

    if (request.method === "eth_requestAccounts") {
      const account = accounts.get(origin)

      if (account != null)
        return [account.addrs.eth]

      const previous = requests.get(origin)

      if (previous != null)
        return await previous.promise

      using stack = new DisposableStack()

      const current = Promise.withResolvers<Account>()

      requests.set(origin, current)
      stack.defer(() => requests.delete(origin))

      chrome.sidePanel.onClosed.addListener(current.reject)
      stack.defer(() => chrome.sidePanel.onClosed.removeListener(current.reject))

      await chrome.sidePanel.open({ windowId })

      const account2 = await current.promise

      return [account2.addrs.eth]
    }

    if (request.method === "connect") {
      const account = accounts.get(origin)

      if (account != null)
        return [account.addrs.sol]

      const previous = requests.get(origin)

      if (previous != null)
        return await previous.promise

      using stack = new DisposableStack()

      const current = Promise.withResolvers<Account>()

      requests.set(origin, current)
      stack.defer(() => requests.delete(origin))

      chrome.sidePanel.onClosed.addListener(current.reject)
      stack.defer(() => chrome.sidePanel.onClosed.removeListener(current.reject))

      await chrome.sidePanel.open({ windowId })

      const account2 = await current.promise

      return [account2.addrs.sol]
    }

    throw new RpcMethodNotFoundError()
  }

  const onMessage = async (init: RpcRequestInit) => {
    try {
      const request = RpcRequest.from(init)

      console.log("->", request)

      const response = new RpcOk(request.id, await route(request))

      console.log("<-", response)

      port.postMessage(response)

      return
    } catch (error: unknown) {
      console.error(error)

      const request = RpcRequest.from(init)

      const response = new RpcErr(request.id, RpcError.rewrap(error))

      console.error("<-", response)

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
      const _ = request.params

      const aborter = new AbortController()
      aborters.set(port, aborter)
      const { signal } = aborter

      await using stack = new AsyncDisposableStack()

      const cleaner = new AbortController()
      stack.defer(() => cleaner.abort())

      const self = {
        name: "Brume Click",
        description: "The browser extension for one-click wallet login",
        url: "https://click.brume.tech",
        icons: []
      }

      const requiredNamespaces = {
        eip155: {
          chains: ["eip155:1"],
          methods: ["personal_sign"],
          events: []
        },
        solana: {
          chains: ["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"],
          methods: ["solana_signMessage"],
          events: []
        }
      }

      const jwk = crypto.getRandomValues(new Uint8Array(32))

      const client = await IrnClient.open(WalletConnect.RELAY, jwk, "c6c9bacd35afa3eb9e6cccf6d8464395")

      const pairing = await WcPairing.generate(client)

      port.postMessage(new RpcRequest(crypto.randomUUID(), "pairingChanged", [pairing.url]))

      const upgraded = Promise.withResolvers<WcSession>()
      stack.defer(() => upgraded.reject())
      upgraded.promise.catch(() => { })

      pairing.addEventListener("upgrade", event => upgraded.resolve(event.data), { signal: cleaner.signal })
      pairing.addEventListener("close", upgraded.reject, { signal: cleaner.signal })
      signal.addEventListener("abort", upgraded.reject, { signal: cleaner.signal })

      await pairing.open()

      stack.defer(async () => await pairing.close())
      stack.defer(async () => await pairing.delete())

      await pairing.propose({ self, requiredNamespaces })

      const session = await upgraded.promise

      const onevent = (data: any) => console.log("Session event:", data)

      session.addEventListener("event", event => onevent(event.data), { signal: session.closing })
      session.addEventListener("close", () => console.log("Session closed"), { signal: session.closing })

      const settled = Promise.withResolvers<WcSessionSettleParams>()
      stack.defer(() => settled.reject())
      settled.promise.catch(() => { })

      session.addEventListener("settle", event => settled.resolve(event.data), { signal: cleaner.signal })
      session.addEventListener("close", settled.reject, { signal: cleaner.signal })
      signal.addEventListener("abort", settled.reject, { signal: cleaner.signal })

      await session.open()

      let success = false

      stack.defer(async () => success ? undefined : await session.close())
      stack.defer(async () => success ? undefined : await session.delete())

      const stl = await settled.promise

      success = true

      // return { wcs: session, jwk, stl }

      return
    }

    if (request.method === "wc_abandon") {
      const _ = request.params

      aborters.get(port)?.abort()

      return
    }

    if (request.method === "account") {
      const [location] = request.params as [string]

      const { origin } = new URL(location)

      const account = accounts.get(origin)

      return account
    }

    if (request.method === "connect") {
      const [location, account] = request.params as [string, Account]

      const { origin } = new URL(location)

      accounts.set(origin, account)
      requests.get(origin)?.resolve(account)

      for (const channel of channels) {
        const [port, origin2] = channel

        if (origin2 !== origin)
          continue

        port.postMessage(new RpcRequest(crypto.randomUUID(), "eth_accountsChanged", [account.addrs.eth]))
      }

      return true
    }

    if (request.method === "disconnect") {
      const [location] = request.params as [string]

      const { origin } = new URL(location)

      accounts.delete(origin)

      for (const channel of channels) {
        const [port, origin2] = channel

        if (origin2 !== origin)
          continue

        port.postMessage(new RpcRequest(crypto.randomUUID(), "eth_accountsChanged", []))
      }

      return true
    }

    if (request.method === "accounts") {
      const _ = request.params

      const { accounts = [] } = await chrome.storage.session.get<{ accounts?: Account[] }>("accounts")

      return accounts
    }

    if (request.method === "create") {
      const [account] = request.params as [Account]

      const { accounts = [] } = await chrome.storage.session.get<{ accounts?: Account[] }>("accounts")

      accounts.push(account)

      await chrome.storage.session.set({ accounts })

      return accounts
    }

    throw new RpcMethodNotFoundError()
  }

  const onMessage = async (init: RpcRequestInit) => {
    try {
      const request = RpcRequest.from(init)

      console.log("->", request)

      const response = new RpcOk(request.id, await route(request))

      console.log("<-", response)

      port.postMessage(response)

      return
    } catch (error: unknown) {
      console.error(error)

      const request = RpcRequest.from(init)

      const response = new RpcErr(request.id, RpcError.rewrap(error))

      console.error("<-", response)

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

    port.postMessage(new RpcRequest(crypto.randomUUID(), "locationChanged", [tab.url]))
  }

  const onUpdated = async (tabId: number) => {
    const tab = await chrome.tabs.get(tabId)

    if (!tab.active)
      return
    if (!tab.url)
      return

    port.postMessage(new RpcRequest(crypto.randomUUID(), "locationChanged", [tab.url]))
  }

  chrome.tabs.onActivated.addListener(onActivated)
  chrome.tabs.onUpdated.addListener(onUpdated)

  stack.defer(() => chrome.tabs.onActivated.removeListener(onActivated))
  stack.defer(() => chrome.tabs.onUpdated.removeListener(onUpdated))

  return
})