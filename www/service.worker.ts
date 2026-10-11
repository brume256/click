/// <reference types="chrome" />

import { RpcErr, RpcError, RpcMethodNotFoundError, RpcOk, RpcRequest, RpcRequestInit } from "@hazae41/jsonrpc";

chrome.storage.session.set({ accounts: [] })

// TODO: wait for user to select an account
chrome.sidePanel.onOpened.addListener(() => chrome.storage.session.set({ accounts: ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"] }))
chrome.sidePanel.onClosed.addListener(() => chrome.storage.session.set({ accounts: [] }))

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

chrome.runtime.onConnect.addListener((port) => {
  const stack = new DisposableStack()

  if (port.sender?.tab?.id == null)
    return

  const tabId = port.sender?.tab?.id

  const route = async (request: RpcRequest) => {
    if (request.method === "eth_accounts")
      return await chrome.storage.session.get<{ accounts: string[] }>("accounts").then(x => x.accounts)
    if (request.method === "eth_requestAccounts") {
      await chrome.sidePanel.open({ tabId })

      // TODO: wait for user to select an account

      return ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"]
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

  const onOpened = () => port.postMessage({ method: "eth_accountsChanged", params: ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"] })
  const onClosed = () => port.postMessage({ method: "eth_accountsChanged", params: [] })

  chrome.sidePanel.onOpened.addListener(onOpened)
  chrome.sidePanel.onClosed.addListener(onClosed)

  stack.defer(() => chrome.sidePanel.onOpened.removeListener(onOpened))
  stack.defer(() => chrome.sidePanel.onClosed.removeListener(onClosed))

  return
})