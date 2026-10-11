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
      console.log("received", message)

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

  useEffect(() => {
    request<string>({ method: "chrome_tabUrl" }).then(setOrigin)
  }, [request])

  useEffect(() => {
    const onMessage = (message: RpcMessageInit) => {
      if ("method" in message === false)
        return

      const request = RpcRequest.from(message)

      if (request.method === "chrome_tabChanged") {
        const [origin] = request.params as [string]

        setOrigin(origin)

        return
      }

      return
    }

    port.onMessage.addListener(onMessage)

    return () => port.onMessage.removeListener(onMessage)
  }, [port])

  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    request<boolean>({ method: "enabled", params: [origin] }).then(setEnabled)
  }, [request, origin])

  const onEnable = useCallback(async () => {
    await request({ method: "enable", params: [origin] }).then(() => setEnabled(true))
  }, [request, origin])

  const onDisable = useCallback(async () => {
    await request({ method: "disable", params: [origin] }).then(() => setEnabled(false))
  }, [request, origin])

  if (origin == null)
    return null

  return <div className="h-full w-full flex flex-col items-center p-8">
    {origin}
    <div className="h-4" />
    {!enabled && <Fragment>
      <div className="w-[min(20rem,100%)] aspect-video border-2 border-default-contrast border-spacing-1 rounded-xl flex items-center justify-center">
        Select a wallet
      </div>
    </Fragment>}
    <div className="h-4" />
    {!enabled && <Fragment>
      <button className="w-[min(20rem,100%)] aspect-video bg-default text-default selection-default rounded-xl font-medium p-4 flex flex-col items-start"
        data-theme="opposite"
        onClick={onEnable}>
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
      <button className="w-[min(20rem,100%)] aspect-video bg-default text-default selection-default border-2 border-default-contrast border-spacing-1 rounded-xl font-medium p-4 flex flex-col items-start"
        data-theme="opposite"
        onClick={onDisable}>
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

