/// <reference types="chrome" />

import { Outline } from "@/libs/heroicons/mod.ts";
import { Nullable } from "@/libs/nullable/mod.ts";
import { RpcMessageInit, RpcRequest, RpcRequestPreinit, RpcResponse } from "@hazae41/jsonrpc";
import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";

React;

const accounts = [
  { name: "Vitalik", address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", color: "blue" },
  { name: "Alice", address: "0x1234567890abcdef1234567890abcdef12345678", color: "red" }
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
    <div className="w-[18rem] bg-default-contrast po-2 rounded-xl flex justify-center">
      {origin}
    </div>
    <div className="h-4" />
    {!account && <Fragment>
      <div className="w-[18rem] aspect-video bg-default-contrast border-2 border-default-contrast rounded-xl flex items-center justify-center animate-opacity-in">
      </div>
    </Fragment>}
    {account && <Fragment key={account}>
      <button type="button" className="w-[18rem] aspect-video bg-default text-default selection-default border-2 border-default-contrast rounded-xl p-4 flex flex-col items-start animate-opacity-in
      data-[color=red]:bg-red-400 
      data-[color=orange]:bg-orange-400 
      data-[color=amber]:bg-amber-400 
      data-[color=yellow]:bg-yellow-400 
      data-[color=lime]:bg-lime-400 
      data-[color=green]:bg-green-400 
      data-[color=emerald]:bg-emerald-400 
      data-[color=teal]:bg-teal-400 
      data-[color=cyan]:bg-cyan-400 
      data-[color=sky]:bg-sky-400 
      data-[color=blue]:bg-blue-400 
      data-[color=indigo]:bg-indigo-400 
      data-[color=violet]:bg-violet-400 
      data-[color=purple]:bg-purple-400 
      data-[color=fuchsia]:bg-fuchsia-400 
      data-[color=pink]:bg-pink-400 
      data-[color=rose]:bg-rose-400 
      in-dark:data-[color=red]:bg-red-500
      in-dark:data-[color=orange]:bg-orange-500
      in-dark:data-[color=amber]:bg-amber-500
      in-dark:data-[color=yellow]:bg-yellow-500
      in-dark:data-[color=lime]:bg-lime-500
      in-dark:data-[color=green]:bg-green-500
      in-dark:data-[color=emerald]:bg-emerald-500
      in-dark:data-[color=teal]:bg-teal-500
      in-dark:data-[color=cyan]:bg-cyan-500
      in-dark:data-[color=sky]:bg-sky-500
      in-dark:data-[color=blue]:bg-blue-500
      in-dark:data-[color=indigo]:bg-indigo-500
      in-dark:data-[color=violet]:bg-violet-500
      in-dark:data-[color=purple]:bg-purple-500
      in-dark:data-[color=fuchsia]:bg-fuchsia-500
      in-dark:data-[color=pink]:bg-pink-500
      in-dark:data-[color=rose]:bg-rose-500"
        data-theme={accounts.find(x => x.address === account)?.color == null ? "opposite" : "dark"}
        data-color={accounts.find(x => x.address === account)?.color}
        onClick={onDisconnect}>
        <div className="font-medium">
          {accounts.find(x => x.address === account)?.name}
        </div>
        <div className="grow" />
        <div className="bg-default-contrast rounded-full po-1 flex items-center gap-2">
          <Outline.LinkIcon className="size-5" />
          WalletConnect
        </div>
      </button>
    </Fragment>}
    <div className="h-4 grow" />
    <div className="w-full flex flex-col items-center">
      {accounts.map((x, i) =>
        <Fragment key={x.address}>
          <AccountCard index={i} name={x.name} address={x.address} color={x.color} connect={onConnect} />
        </Fragment>)}
      <div className="-mt-28 w-[18rem] aspect-video bg-default border-2 border-default-contrast rounded-xl flex items-center justify-center hover:translate-x-3 transition-transform"
        style={{ zIndex: accounts.length }}>
        <Outline.PlusIcon className="size-8" />
      </div>
    </div>
  </div>
}

export function AccountCard(props: { index: number } & { name: string } & { address: string } & { color: Nullable<string> } & { connect(address: string): void }) {
  const { index, name, address, color, connect } = props

  const onClick = useCallback(() => {
    connect(address)
  }, [connect, address])

  return <button type="button" className="-mt-28 w-[18rem] aspect-video bg-default text-default selection-default border-2 border-default-contrast rounded-xl p-4 flex flex-col items-start hover:translate-x-3 transition-transform
  data-[color=red]:bg-red-400 
  data-[color=orange]:bg-orange-400 
  data-[color=amber]:bg-amber-400 
  data-[color=yellow]:bg-yellow-400 
  data-[color=lime]:bg-lime-400 
  data-[color=green]:bg-green-400 
  data-[color=emerald]:bg-emerald-400 
  data-[color=teal]:bg-teal-400 
  data-[color=cyan]:bg-cyan-400 
  data-[color=sky]:bg-sky-400 
  data-[color=blue]:bg-blue-400 
  data-[color=indigo]:bg-indigo-400 
  data-[color=violet]:bg-violet-400 
  data-[color=purple]:bg-purple-400 
  data-[color=fuchsia]:bg-fuchsia-400 
  data-[color=pink]:bg-pink-400 
  data-[color=rose]:bg-rose-400 
  in-dark:data-[color=red]:bg-red-500
  in-dark:data-[color=orange]:bg-orange-500
  in-dark:data-[color=amber]:bg-amber-500
  in-dark:data-[color=yellow]:bg-yellow-500
  in-dark:data-[color=lime]:bg-lime-500
  in-dark:data-[color=green]:bg-green-500
  in-dark:data-[color=emerald]:bg-emerald-500
  in-dark:data-[color=teal]:bg-teal-500
  in-dark:data-[color=cyan]:bg-cyan-500
  in-dark:data-[color=sky]:bg-sky-500
  in-dark:data-[color=blue]:bg-blue-500
  in-dark:data-[color=indigo]:bg-indigo-500
  in-dark:data-[color=violet]:bg-violet-500
  in-dark:data-[color=purple]:bg-purple-500
  in-dark:data-[color=fuchsia]:bg-fuchsia-500
  in-dark:data-[color=pink]:bg-pink-500
  in-dark:data-[color=rose]:bg-rose-500"
    style={{ zIndex: index }}
    data-theme={color == null ? "opposite" : "dark"}
    data-color={color}
    onClick={onClick}>
    <div className="w-full flex items-center">
      <div className="font-medium">
        {name}
      </div>
      <div className="w-4 grow" />
      <button>
        <Outline.EllipsisVerticalIcon className="size-5" />
      </button>
    </div>
    <div className="grow" />
    <div className="bg-default-contrast rounded-full po-1 flex items-center gap-2">
      <Outline.LinkIcon className="size-5" />
      WalletConnect
    </div>
  </button>
}

