/// <reference types="chrome" />

import { RpcErr, RpcError, RpcMethodNotFoundError, RpcOk, RpcRequest, RpcRequestInit } from "@hazae41/jsonrpc";

const accounts = new Map<string, string>()
const requests = new Map<string, (account: string) => void>()

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
        return [account]

      return []
    }

    if (request.method === "eth_requestAccounts") {
      const account = accounts.get(origin)

      if (account != null)
        return [account]

      using stack = new DisposableStack()

      await chrome.sidePanel.open({ windowId })

      const { promise, resolve, reject } = Promise.withResolvers<string>()

      requests.set(origin, resolve)
      stack.defer(() => requests.delete(origin))

      chrome.sidePanel.onClosed.addListener(reject)
      stack.defer(() => chrome.sidePanel.onClosed.removeListener(reject))

      return [await promise]
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
    if (request.method === "chrome_tab") {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })

      if (tab.url == null)
        return

      const url = new URL(tab.url)

      return url.origin
    }

    if (request.method === "account_get") {
      const [origin] = request.params as [string]

      const account = accounts.get(origin)

      return account
    }

    if (request.method === "account_connect") {
      const [origin, account] = request.params as [string, string]

      accounts.set(origin, account)
      requests.get(origin)?.(account)

      return true
    }

    if (request.method === "account_disconnect") {
      const [origin] = request.params as [string]

      accounts.delete(origin)

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

    const url = new URL(tab.url)

    port.postMessage(new RpcRequest(crypto.randomUUID(), "chrome_tabChanged", [url.origin]))
  }

  const onUpdated = async (tabId: number) => {
    const tab = await chrome.tabs.get(tabId)

    if (!tab.active)
      return
    if (tab.url == null)
      return

    const url = new URL(tab.url)

    port.postMessage(new RpcRequest(crypto.randomUUID(), "chrome_tabChanged", [url.origin]))
  }

  chrome.tabs.onActivated.addListener(onActivated)
  chrome.tabs.onUpdated.addListener(onUpdated)

  stack.defer(() => chrome.tabs.onActivated.removeListener(onActivated))
  stack.defer(() => chrome.tabs.onUpdated.removeListener(onUpdated))

  return
})