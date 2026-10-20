/// <reference types="chrome" />

import { InOther } from "@/libs/anchor/mod.tsx";
import { InButton, WideContrastButton, WideOppositeButton } from "@/libs/button/mod.tsx";
import { Outline } from "@/libs/heroicons/mod.ts";
import { Nullable } from "@/libs/nullable/mod.ts";
import { SubpathProvider, useAnchorWithCoords, useHashSubpath, usePathContext } from "@hazae41/chemin";
import { RpcMessageInit, RpcRequest, RpcRequestPreinit, RpcResponse } from "@hazae41/jsonrpc";
import { PathBoard, PathPaper } from "@hazae41/modal";
import { useCloseContext } from "@hazae41/react-close-context";
import { QrEncoder } from "@hazae41/visage";
import React, { Fragment, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";

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

    if (request.method === "chrome_locationChanged") {
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

export function ColorAnchor(props: { color?: Nullable<string> }) {
  const { color } = props

  const path = usePathContext().getOrThrow()
  const hash = useHashSubpath(path)

  const coords = useAnchorWithCoords(hash, "/color")

  return <a className="group rounded-full p-1 hover:bg-default-double-contrast focus-visible:bg-default-double-contrast focus-visible:outline-none"
    href={coords.url.hash}
    onClick={coords.onClick}
    onKeyDown={coords.onKeyDown}>
    <InOther>
      <div className="size-5 rounded-full bg-opposite
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
        data-color={color} />
    </InOther>
  </a>
}

export function ColorMenu(props: { ok(color: Nullable<string>): void }) {
  const { ok } = props

  return <div className="grid grid-cols-6 grid-auto-rows gap-2">
    <button className="group rounded-full p-1 hover:bg-default-double-contrast focus-visible:bg-default-double-contrast focus-visible:outline-none"
      onClick={() => ok(null)}
      type="button">
      <InButton>
        <div className="size-5 rounded-full bg-opposite" />
      </InButton>
    </button>
    {["red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"].map(color =>
      <Fragment key={color}>
        <button className="group rounded-full p-1 hover:bg-default-double-contrast focus-visible:bg-default-double-contrast focus-visible:outline-none"
          onClick={() => ok(color)}
          type="button">
          <InButton>
            <div className="size-5 rounded-full
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
              data-color={color} />
          </InButton>
        </button>
      </Fragment>)}
  </div>
}

export function Connect(props: { channel: Channel } & { title: string } & { color: Nullable<string> }) {
  const { channel, title, color } = props

  const close = useCloseContext().getOrThrow()

  const [code, setCode] = useState<string>()
  const [blob, setBlob] = useState<string>()

  useEffect(() => {
    channel.request<void>({ method: "wc_propose", params: [title, color] }).then(() => close()).catch(console.error)
    return () => void channel.request<void>({ method: "wc_abandon" }).catch(console.error)
  }, [])

  const onMessage = useCallback((message: RpcMessageInit) => {
    if ("method" in message === false)
      return

    const request = RpcRequest.from(message)

    if (request.method === "wc_pairingChanged") {
      const [code] = request.params as [string]

      setCode(code)

      const source = new TextEncoder().encode(code)
      const matrix = new QrEncoder("byte").encode(source)

      const image = new OffscreenCanvas(matrix.width, matrix.width)
      const pixel = new ImageData(matrix.width, matrix.width)

      for (let i = 0; i < matrix.array.length; i++) {
        pixel.data[i * 4 + 0] = matrix.array[i] % 2 ? 255 : 0
        pixel.data[i * 4 + 1] = matrix.array[i] % 2 ? 255 : 0
        pixel.data[i * 4 + 2] = matrix.array[i] % 2 ? 255 : 0
        pixel.data[i * 4 + 3] = 255
      }

      image.getContext("2d")!.putImageData(pixel, 0, 0)

      const canvas = new OffscreenCanvas(300, 300)

      const context = canvas.getContext("2d")!
      context.imageSmoothingEnabled = false
      context.drawImage(image, 0, 0, matrix.width, matrix.width, 0, 0, canvas.width, canvas.width)

      canvas.convertToBlob({ type: "image/png" }).then((blob) => setBlob(URL.createObjectURL(blob!)))

      return
    }

    return
  }, [])

  useEffect(() => {
    channel.port.onMessage.addListener(onMessage)
    return () => channel.port.onMessage.removeListener(onMessage)
  }, [channel, onMessage])

  useEffect(() => () => {
    if (blob == null)
      return
    else
      URL.revokeObjectURL(blob)
  }, [blob])

  return <Fragment>
    <div className="font-medium">
      WalletConnect code
    </div>
    <div className="text-default-contrast">
      Your WalletConnect pairing code. Use it to connect your wallet.
    </div>
    <div className="h-4" />
    <div className="bg-default-contrast po-2 rounded-xl flex items-center gap-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-default-contrast">
      <input className="w-full focus-visible:outline-none"
        readOnly
        autoComplete="off"
        onFocus={e => e.currentTarget.select()}
        value={code} />
      <div className="flex items-center gap-2">
        <a className="group rounded-full p-1 hover:bg-default-double-contrast focus-visible:bg-default-double-contrast focus-visible:outline-none"
          href={blob}
          target="_blank"
          rel="noreferrer">
          <InOther>
            <Outline.QrCodeIcon className="size-5" />
          </InOther>
        </a>
      </div>
    </div>
  </Fragment>
}

export function Create(props: { channel: Channel }) {
  const { channel } = props

  const close = useCloseContext().getOrThrow()

  const path = usePathContext().getOrThrow()
  const hash = useHashSubpath(path)

  const [$title, setTitle] = useState("")

  const title = useDeferredValue($title || "Main")

  const [color, setColor] = useState<Nullable<string>>(["red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"][Math.floor(Math.random() * 16)])

  const [connect, setConnect] = useState(false)

  const onClose = useCallback(() => {
    close()
  }, [close])

  const onBack = useCallback(() => {
    setConnect(false)
  }, [])

  const onNext = useCallback(() => {
    setConnect(true)
  }, [])

  return <div className="flex flex-col grow p-6 text-base">
    <SubpathProvider value={hash}>
      {hash.url.pathname === "/color" &&
        <PathPaper>
          <ColorMenu ok={setColor} />
        </PathPaper>}
    </SubpathProvider>
    <h1 className="text-xl font-medium">
      Add account
    </h1>
    <div className="h-6" />
    <div className="flex items-center justify-center">
      <button type="button" className="w-[18rem] aspect-video bg-default text-default selection-default border-2 border-default-contrast rounded-xl p-4 flex flex-col items-start
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
          {title}
        </div>
        <div className="grow" />
        <div className="bg-default-contrast rounded-xl po-1 flex items-center gap-2">
          <Outline.LinkIcon className="size-5" />
          WalletConnect
        </div>
      </button>
    </div>
    <form className="grow flex flex-col">
      <input className="hidden"
        autoComplete="off"
        name="username" />
      <div className="h-6" />
      {!connect && <Fragment>
        <div className="font-medium">
          Title
        </div>
        <div className="text-default-contrast">
          Name this account. Not shared anywhere.
        </div>
        <div className="h-4" />
        <div className="bg-default-contrast po-2 rounded-xl flex items-center gap-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-default-contrast">
          <input className="w-full focus-visible:outline-none"
            autoComplete="off"
            placeholder={title}
            onChange={e => setTitle(e.target.value)}
            value={$title} />
          <div className="flex items-center gap-2">
            <ColorAnchor color={color} />
          </div>
        </div>
      </Fragment>}
      {connect && <Fragment>
        <Connect
          channel={channel}
          title={title}
          color={color} />
      </Fragment>}
      <div className="h-8 grow" />
      <div className="flex items-center flex-wrap-reverse gap-2">
        <WideContrastButton
          onClick={onClose}
          type="button">
          Cancel
        </WideContrastButton>
        {!connect && <Fragment>
          <WideOppositeButton
            onClick={onNext}
            type="button">
            Next
          </WideOppositeButton>
        </Fragment>}
        {connect && <Fragment>
          <WideOppositeButton
            onClick={onBack}
            type="button">
            Back
          </WideOppositeButton>
        </Fragment>}
      </div>
    </form>
  </div>
}

export function App(props: { channel: Channel } & { location: URL }) {
  const { channel, location } = props

  const path = usePathContext().getOrThrow()

  const create = useAnchorWithCoords(path, "/create")

  const [account, setAccount] = useState<Account>()

  const onMessage = useCallback((message: RpcMessageInit) => {
    if ("method" in message === false)
      return

    const request = RpcRequest.from(message)

    if (request.method === "wc_accountChanged") {
      const [account] = request.params as [Account]

      setAccount(account)

      return
    }

    if (request.method === "wc_accountsChanged") {
      const accounts = request.params as Account[]

      setAccounts(accounts)

      return
    }

    return
  }, [])

  useEffect(() => {
    channel.port.onMessage.addListener(onMessage)
    return () => channel.port.onMessage.removeListener(onMessage)
  }, [channel, onMessage])

  useEffect(() => {
    channel.request<Account>({ method: "wc_account", params: [location] }).then(setAccount)
  }, [channel, location])

  const onConnect = useCallback(async (account: Account) => {
    await channel.request({ method: "wc_connect", params: [location, account] })
  }, [channel, location])

  const onDisconnect = useCallback(async () => {
    await channel.request({ method: "wc_disconnect", params: [location] })
  }, [channel, location])

  const [accounts, setAccounts] = useState<Account[]>([])

  useEffect(() => {
    channel.request<Account[]>({ method: "wc_accounts", params: [location] }).then(setAccounts)
  }, [channel, location])

  if (location == null)
    return null

  return <div className="h-full w-full flex flex-col items-center p-8">
    <SubpathProvider value={path}>
      {path.url.pathname === "/create" &&
        <PathBoard>
          <Create channel={channel} />
        </PathBoard>}
    </SubpathProvider>
    {!account && <Fragment>
      <div className="w-[18rem] aspect-video bg-default-contrast border-2 border-default-contrast rounded-xl flex items-center justify-center p-8 break-all overflow-y-auto animate-opacity-in">
        Choose an account
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
    <div className="mt-28 w-full flex flex-col items-center isolate">
      {accounts.map(x =>
        <Fragment key={x.addrs.eth}>
          <AccountCard account={x} connect={onConnect} />
        </Fragment>)}
      <a className="-mt-28 z-0 w-[18rem] aspect-video bg-default border-2 border-default-contrast rounded-xl flex items-center justify-center hover:translate-x-3 transition-transform"
        style={{ zIndex: accounts.length }}
        onKeyDown={create.onKeyDown}
        onClick={create.onClick}
        href={create.url.hash}>
        <Outline.PlusIcon className="size-8" />
      </a>
    </div>
  </div>
}

export function AccountCard(props: { account: Account } & { connect(account: Account): void }) {
  const { account, connect } = props

  const onClick = useCallback(() => {
    connect(account)
  }, [connect, account])

  return <button type="button" className="-mt-28 z-0 w-[18rem] aspect-video bg-default text-default selection-default border-2 border-default-contrast rounded-xl p-4 flex flex-col items-start hover:translate-x-3 transition-transform
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

