/// <reference types="chrome" />

import { RpcErr, RpcError, RpcMethodNotFoundError, RpcOk, RpcRequest, RpcRequestInit } from "@hazae41/jsonrpc";

chrome.storage.session.set({ accounts: [] })

chrome.sidePanel.onOpened.addListener(() => chrome.storage.session.set({ accounts: ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"] }))
chrome.sidePanel.onClosed.addListener(() => chrome.storage.session.set({ accounts: [] }))

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

async function route(request: RpcRequest) {
  if (request.method === "eth_accounts")
    return await chrome.storage.session.get<{ accounts: string[] }>("accounts").then(x => x.accounts)
  if (request.method === "eth_requestAccounts") {
    const accounts = await chrome.storage.session.get<{ accounts: string[] }>("accounts").then(x => x.accounts)

    if (accounts.length)
      return accounts

    chrome.action.setBadgeText({ text: "1" })
    chrome.action.setBadgeBackgroundColor({ color: "blue" })

    const { promise, resolve } = Promise.withResolvers<void>()

    const onOpened = () => resolve()

    chrome.sidePanel.onOpened.addListener(onOpened)

    await promise

    chrome.sidePanel.onOpened.removeListener(onOpened)

    return await chrome.storage.session.get<{ accounts: string[] }>("accounts").then(x => x.accounts)
  }

  throw new RpcMethodNotFoundError()
}

chrome.runtime.onConnect.addListener((port) => {
  const stack = new DisposableStack()

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

  const onOpened = () => port.postMessage({ method: "eth_accountsChanged", params: ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"] })
  const onClosed = () => port.postMessage({ method: "eth_accountsChanged", params: [] })

  chrome.sidePanel.onOpened.addListener(onOpened)
  chrome.sidePanel.onClosed.addListener(onClosed)

  stack.defer(() => chrome.sidePanel.onOpened.removeListener(onOpened))
  stack.defer(() => chrome.sidePanel.onClosed.removeListener(onClosed))

  return
})