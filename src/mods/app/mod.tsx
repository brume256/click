/// <reference types="chrome" />

import { Outline } from "@/libs/heroicons/mod.ts";
import { RpcMessageInit, RpcRequest, RpcRequestPreinit, RpcResponse } from "@hazae41/jsonrpc";
import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";

React;

const accounts = [
  "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "0x1234567890abcdef1234567890abcdef12345678"
]

export function App() {
  const port = useMemo(() => {
    return chrome.runtime.connect()
  }, [])

  useEffect(() => () => {
    port.disconnect()
  }, [])

  const request = useCallback(async <T = unknown>(init: RpcRequestPreinit) => {
    const { method, params } = init

    const request = new RpcRequest(crypto.randomUUID(), method, params)

    const { promise, resolve } = Promise.withResolvers<RpcResponse>()

    const onMessage = (message: RpcMessageInit) => {
      if ("method" in message === true)
        return

      const response = RpcResponse.from(message)

      if (response.id !== request.id)
        return

      resolve(response)
    }

    port.onMessage.addListener(onMessage)

    port.postMessage(request)

    const response = await promise

    port.onMessage.removeListener(onMessage)

    return response.getOrThrow() as T
  }, [port])

  const [origin, setOrigin] = useState<string>()

  const onMessage = useCallback((message: RpcMessageInit) => {
    if ("method" in message === false)
      return

    const request = RpcRequest.from(message)

    if (request.method === "chrome_tabChanged") {
      const [origin] = request.params as [string]

      setOrigin(origin)

      return
    }

    return
  }, [])

  useEffect(() => {
    port.onMessage.addListener(onMessage)
    return () => port.onMessage.removeListener(onMessage)
  }, [port, onMessage])

  useEffect(() => {
    request<string>({ method: "chrome_tab" }).then(setOrigin)
  }, [request])

  const [account, setAccount] = useState<string>()

  useEffect(() => {
    if (origin == null)
      return

    request<string>({ method: "account_get", params: [origin] }).then(setAccount)

    return
  }, [request, origin])

  const onConnect = useCallback(async (address: string) => {
    await request({ method: "account_connect", params: [origin, address] }).then(() => setAccount(address))
  }, [request, origin])

  const onDisconnect = useCallback(async () => {
    await request({ method: "account_disconnect", params: [origin] }).then(() => setAccount(undefined))
  }, [request, origin])

  if (origin == null)
    return null

  return <div className="h-full w-full flex flex-col items-center p-8">
    <div className="w-full bg-default-contrast po-2 rounded-xl flex justify-center">
      {origin}
    </div>
    <div className="h-4" />
    {!account && <Fragment>
      <div className="w-[min(20rem,100%)] aspect-video bg-default-contrast border-2 border-default-contrast rounded-xl flex items-center justify-center animate-opacity-in">
      </div>
    </Fragment>}
    {account && <Fragment key={account}>
      <button type="button" className="w-[min(20rem,100%)] aspect-video bg-default text-default selection-default border-2 border-default-contrast rounded-xl p-4 flex flex-col items-start animate-opacity-in"
        data-theme="opposite"
        onClick={onDisconnect}>
        <div className="font-medium">
          {account.slice(0, 6) + "..." + account.slice(-4)}
        </div>
        <div className="grow" />
        <div className="bg-default-contrast rounded-full po-1 flex items-center gap-2">
          <Outline.LinkIcon className="size-5" />
          WalletConnect
        </div>
      </button>
    </Fragment>}
    <div className="h-4" />
    {accounts.map((x, i) =>
      <Fragment key={x}>
        <AccountCard index={i} address={x} connect={onConnect} />
      </Fragment>)}
    <div className="w-[min(20rem,100%)] aspect-video bg-default border-2 border-default-contrast rounded-xl flex items-center justify-center hover:translate-x-3 transition-transform"
      style={{ transform: `translateY(calc(${accounts.length} * -70%))` }}>
      <Outline.PlusIcon className="size-8" />
    </div>
  </div>
}

export function AccountCard(props: { index: number } & { address: string } & { connect(address: string): void }) {
  const { index, address, connect } = props

  const onClick = useCallback(() => {
    connect(address)
  }, [connect, address])

  return <button type="button" className="w-[min(20rem,100%)] aspect-video bg-default text-default selection-default border-2 border-default-contrast rounded-xl p-4 flex flex-col items-start hover:translate-x-3 transition-transform"
    style={{ transform: `translateY(calc(${index} * -70%))` }}
    data-theme="opposite"
    onClick={onClick}>
    <div className="font-medium">
      {address.slice(0, 6) + "..." + address.slice(-4)}
    </div>
    <div className="grow" />
    <div className="bg-default-contrast rounded-full po-1 flex items-center gap-2">
      <Outline.LinkIcon className="size-5" />
      WalletConnect
    </div>
  </button>
}

