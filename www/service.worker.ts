/// <reference types="chrome" />

import { RpcErr, RpcError, RpcMethodNotFoundError, RpcOk, RpcRequest, RpcRequestInit } from "@hazae41/jsonrpc";

chrome.storage.session.set({ accounts: [] })

chrome.sidePanel.onOpened.addListener(() => chrome.storage.session.set({ accounts: ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"] }))
chrome.sidePanel.onClosed.addListener(() => chrome.storage.session.set({ accounts: [] }))

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

async function route(request: RpcRequest) {
  if (request.method === "eth_accounts")
    return await chrome.storage.session.get("accounts").then(x => x.accounts)
  if (request.method === "eth_requestAccounts")
    return await chrome.storage.session.get("accounts").then(x => x.accounts)

  throw new RpcMethodNotFoundError()
}

chrome.runtime.onConnect.addListener((port) => {
  const stack = new DisposableStack()

  const onMessage = async (init: RpcRequestInit) => {
    try {
      const request = RpcRequest.from(init)

      const response = new RpcOk(request.id, await route(request))

      port.postMessage(response)

      return
    } catch (e: unknown) {
      const request = RpcRequest.from(init)

      const response = new RpcErr(request.id, RpcError.rewrap(e))

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