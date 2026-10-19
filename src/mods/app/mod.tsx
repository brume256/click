/// <reference types="chrome" />

import { Outline } from "@/libs/heroicons/mod.ts";
import { Nullable } from "@/libs/nullable/mod.ts";
import { useAnchorWithCoords, usePathContext } from "@hazae41/chemin";
import { RpcMessageInit, RpcRequest, RpcRequestPreinit, RpcResponse } from "@hazae41/jsonrpc";
import { PathBoard } from "@hazae41/modal";
import { QrEncoder } from "@hazae41/visage";
import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

React;

interface Addresses {
  readonly eth: string
  readonly sol: string
}

interface Account {
  readonly title: string
  readonly addrs: Addresses
  readonly color: Nullable<string>
}

export function useBackground() {
  const port = useMemo(() => {
    return chrome.runtime.connect()
  }, [])

  useEffect(() => () => {
    port.disconnect()
  }, [])

  const channel = useMemo(() => {
    return new Channel(port)
  }, [port])

  const interval = useMemo(() => setInterval(() => {
    channel.request<void>({ method: "ping" }).catch(() => clearInterval(interval))
  }, 1000), [channel])

  useEffect(() => () => {
    clearInterval(interval)
  }, [channel])

  return channel
}

export class Channel {

  constructor(
    readonly port: chrome.runtime.Port
  ) { }

  async request<T>(init: RpcRequestPreinit) {
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

    this.port.onMessage.addListener(onMessage)

    this.port.postMessage(request)

    const response = await promise

    this.port.onMessage.removeListener(onMessage)

    return response.getOrThrow() as T
  }

}

export function useLocation(channel: Channel) {
  const [location, setLocation] = useState<string>()

  const onMessage = useCallback((message: RpcMessageInit) => {
    if ("method" in message === false)
      return

    const request = RpcRequest.from(message)

    if (request.method === "locationChanged") {
      const [location] = request.params as [string]

      setLocation(location)

      return
    }

    return
  }, [])

  useEffect(() => {
    channel.port.onMessage.addListener(onMessage)
    return () => channel.port.onMessage.removeListener(onMessage)
  }, [channel, onMessage])

  useEffect(() => {
    channel.request<string>({ method: "chrome_location" }).then(setLocation)
  }, [channel])

  return useMemo(() => {
    try {
      return new URL(location!)
    } catch {
      return undefined
    }
  }, [location])
}

export function Display(props: {}) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const source = new TextEncoder().encode("wc:00e46b69-d0cc-4b3e-b6a2-cee442f97188@2?relay-protocol=irn&symKey=91303dedf64285cbbaf9120f6e9d160a5c8aa3deb67017a3874cd272323f48ae")
    const matrix = new QrEncoder("byte").encode(source)

    const code = new OffscreenCanvas(matrix.width, matrix.width)
    const rgba = new ImageData(matrix.width, matrix.width)

    for (let i = 0; i < matrix.array.length; i++) {
      rgba.data[i * 4 + 0] = matrix.array[i] % 2 ? 0 : 255
      rgba.data[i * 4 + 1] = matrix.array[i] % 2 ? 0 : 255
      rgba.data[i * 4 + 2] = matrix.array[i] % 2 ? 0 : 255
      rgba.data[i * 4 + 3] = matrix.array[i] % 2 ? 255 : 0
    }

    code.getContext("2d")!.putImageData(rgba, 0, 0)

    canvas.current!.getContext("2d")!.imageSmoothingEnabled = false
    canvas.current!.getContext("2d")!.drawImage(code, 0, 0, matrix.width, matrix.width, 0, 0, canvas.current!.width, canvas.current!.width)

    return
  }, [])

  const color = "blue"

  return <div className="grow flex flex-col p-6 text-base">
    <h1 className="text-xl font-medium">
      Add account
    </h1>
    <div className="h-6 shrink-0" />
    <div className="flex items-center justify-center">
      <button type="button" className="w-[18rem] aspect-video bg-default text-default selection-default border-2 border-default-contrast rounded-xl p-4 flex flex-col items-start animate-opacity-in hover:scale-105 transition-transform
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
        data-theme={color == null ? "opposite" : "dark"}
        data-color={color}>
        <div className="font-medium text-lg">
          Main
        </div>
        <div className="grow" />
        <div className="bg-default-contrast rounded-xl po-1 flex items-center gap-2">
          <Outline.LinkIcon className="size-5" />
          WalletConnect
        </div>
      </button>
    </div>
    <div className="h-6 shrink-0" />
    <div className="font-medium">
      Name
    </div>
    <div className="text-default-contrast">
      Name of this account. Not shared anywhere.
    </div>
    <div className="h-4 shrink-0" />
    <input className="p-4 bg-default-contrast rounded-xl"
      placeholder="Main" />
    <div className="h-6 shrink-0" />
    <div className="font-medium">
      WalletConnect code
    </div>
    <div className="text-default-contrast">
      Your WalletConnect pairing code.
    </div>
    <div className="h-4 shrink-0" />
    <input className="p-4 bg-default-contrast rounded-xl"
      value="wc:00e46b69-d0cc-4b3e-b6a2-cee442f97188@2?relay-protocol=irn&symKey=91303dedf64285cbbaf9120f6e9d160a5c8aa3deb67017a3874cd272323f48ae" />
    <div className="h-2 shrink-0" />
    <div className="hidden flex flex-col items-center justify-center p-4 bg-default-contrast rounded-xl">
      <canvas ref={canvas} width={200} height={200} />
    </div>
    <div className="h-6 shrink-0 grow" />
    <button className="bg-opposite text-opposite po-2 rounded-xl">
      Cancel
    </button>
  </div>
}

export function App(props: { channel: Channel } & { location: URL }) {
  const { channel, location } = props

  const path = usePathContext().getOrThrow()

  const connect = useAnchorWithCoords(path, "/connect")

  const [account, setAccount] = useState<Account>()

  useEffect(() => {
    channel.request<Account>({ method: "account", params: [location] }).then(setAccount)
  }, [channel, location])

  const onConnect = useCallback(async (account: Account) => {
    await channel.request({ method: "connect", params: [location, account] }).then(() => setAccount(account))
  }, [channel, location])

  const onDisconnect = useCallback(async () => {
    await channel.request({ method: "disconnect", params: [location] }).then(() => setAccount(undefined))
  }, [channel, location])

  const [accounts, setAccounts] = useState<Account[]>([])

  useEffect(() => {
    channel.request<Account[]>({ method: "accounts", params: [location] }).then(setAccounts)
  }, [channel, location])

  // const onPlusClick = useCallback(async () => {
  //   const title = `Account #${accounts.length + 1}`
  //   const addrs = { eth: `0x${crypto.getRandomValues(new Uint8Array(20)).toHex()}`, sol: base58.encode(crypto.getRandomValues(new Uint8Array(32))) }
  //   const color = ["red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"][accounts.length % 16]
  //   await channel.request<Account[]>({ method: "create", params: [{ title, addrs, color }] }).then(setAccounts)
  // }, [])

  if (location == null)
    return null

  return <div className="h-full w-full flex flex-col items-center p-8">
    {path.url.pathname === "/connect" &&
      <PathBoard>
        <Display />
      </PathBoard>}
    {!account && <Fragment>
      <div className="w-[18rem] aspect-video bg-default-contrast border-2 border-default-contrast rounded-xl flex items-center justify-center p-8 break-all overflow-y-auto animate-opacity-in">
        {location.origin}
      </div>
    </Fragment>}
    {account && <Fragment key={account.addrs.eth}>
      <button type="button" className="w-[18rem] aspect-video bg-default text-default selection-default border-2 border-default-contrast rounded-xl p-4 flex flex-col items-start animate-opacity-in hover:scale-105 transition-transform
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
        data-theme={accounts.find(x => x.addrs.eth === account.addrs.eth)?.color == null ? "opposite" : "dark"}
        data-color={accounts.find(x => x.addrs.eth === account.addrs.eth)?.color}
        onClick={onDisconnect}>
        <div className="font-medium text-lg">
          {accounts.find(x => x.addrs.eth === account.addrs.eth)?.title}
        </div>
        <div className="grow" />
        <div className="bg-default-contrast rounded-xl po-1 flex items-center gap-2">
          <Outline.LinkIcon className="size-5" />
          WalletConnect
        </div>
      </button>
    </Fragment>}
    <div className="h-4 grow shrink-0" />
    <div className="mt-28 w-full flex flex-col items-center">
      {accounts.map((x, i) =>
        <Fragment key={x.addrs.eth}>
          <AccountCard index={i} account={x} connect={onConnect} />
        </Fragment>)}
      <a className="-mt-28 w-[18rem] aspect-video bg-default border-2 border-default-contrast rounded-xl flex items-center justify-center hover:translate-x-3 transition-transform"
        style={{ zIndex: accounts.length }}
        onKeyDown={connect.onKeyDown}
        onClick={connect.onClick}
        href={connect.url.hash}>
        <Outline.PlusIcon className="size-8" />
      </a>
    </div>
  </div>
}

export function AccountCard(props: { index: number } & { account: Account } & { connect(account: Account): void }) {
  const { index, account, connect } = props

  const onClick = useCallback(() => {
    connect(account)
  }, [connect, account])

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
    data-theme={account.color == null ? "opposite" : "dark"}
    data-color={account.color}
    onClick={onClick}>
    <div className="w-full flex items-center">
      <div className="font-medium text-lg">
        {account.title}
      </div>
      <div className="w-4 grow" />
      <button type="button">
        <Outline.EllipsisVerticalIcon className="size-5" />
      </button>
    </div>
  </button>
}

