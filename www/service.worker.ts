/// <reference types="chrome" />

import { Nullable } from "@/libs/nullable/mod.ts";
import { RpcErr, RpcError, RpcMethodNotFoundError, RpcOk, RpcRequest, RpcRequestInit } from "@hazae41/jsonrpc";

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
    } catch (e: unknown) {
      const request = RpcRequest.from(init)

      const response = new RpcErr(request.id, RpcError.rewrap(e))

      console.log("<-", response)

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
    if (request.method === "chrome_location") {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })

      if (tab.url == null)
        return

      return tab.url
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
    } catch (e: unknown) {
      const request = RpcRequest.from(init)

      const response = new RpcErr(request.id, RpcError.rewrap(e))

      console.log("<-", response)

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
    if (tab.url == null)
      return

    port.postMessage(new RpcRequest(crypto.randomUUID(), "locationChanged", [tab.url]))
  }

  const onUpdated = async (tabId: number) => {
    const tab = await chrome.tabs.get(tabId)

    if (!tab.active)
      return
    if (tab.url == null)
      return

    port.postMessage(new RpcRequest(crypto.randomUUID(), "locationChanged", [tab.url]))
  }

  chrome.tabs.onActivated.addListener(onActivated)
  chrome.tabs.onUpdated.addListener(onUpdated)

  stack.defer(() => chrome.tabs.onActivated.removeListener(onActivated))
  stack.defer(() => chrome.tabs.onUpdated.removeListener(onUpdated))

  return
})