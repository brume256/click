/// <reference types="chrome" />

import { Outline } from "@/libs/heroicons/mod.ts";
import { RpcMessageInit, RpcRequest, RpcRequestPreinit, RpcResponse } from "@hazae41/jsonrpc";
import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";

React;

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

  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (origin == null)
      return

    request<boolean>({ method: "account_get", params: [origin] }).then(setEnabled)

    return
  }, [request, origin])

  const onConnect = useCallback(async () => {
    await request({ method: "account_connect", params: [origin, "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"] }).then(() => setEnabled(true))
  }, [request, origin])

  const onDisconnect = useCallback(async () => {
    await request({ method: "account_disconnect", params: [origin] }).then(() => setEnabled(false))
  }, [request, origin])

  if (origin == null)
    return null

  return <div className="h-full w-full flex flex-col items-center p-8">
    <div className="w-full bg-default-contrast po-2 rounded-xl flex justify-center">
      {origin}
    </div>
    <div className="h-4" />
    {!enabled && <Fragment>
      <div className="w-[min(20rem,100%)] aspect-video border-2 border-default-contrast border-spacing-1 rounded-xl flex items-center justify-center">
        Select a wallet
      </div>
    </Fragment>}
    <div className="h-4" />
    {!enabled && <Fragment>
      <button type="button" className="w-[min(20rem,100%)] aspect-video bg-default text-default selection-default rounded-xl font-medium p-4 flex flex-col items-start"
        data-theme="opposite"
        onClick={onConnect}>
        <div className="">
          Vitalik
        </div>
        <div className="grow" />
        <div className="bg-default-contrast rounded-full po-1 flex items-center gap-2">
          <Outline.LinkIcon className="size-5" />
          WalletConnect
        </div>
      </button>
    </Fragment>}
    {enabled && <Fragment>
      <button type="button" className="w-[min(20rem,100%)] aspect-video bg-default text-default selection-default border-2 border-default-contrast border-spacing-1 rounded-xl font-medium p-4 flex flex-col items-start"
        data-theme="opposite"
        onClick={onDisconnect}>
        <div className="">
          Vitalik
        </div>
        <div className="grow" />
        <div className="bg-default-contrast rounded-full po-1 flex items-center gap-2">
          <Outline.LinkIcon className="size-5" />
          WalletConnect
        </div>
      </button>
    </Fragment>}
    <div className="h-4" />
    <div className="w-[min(20rem,100%)] aspect-video border-2 border-default-contrast border-dashed rounded-xl flex items-center justify-center">
      <Outline.PlusIcon className="size-8" />
    </div>
  </div>
}

