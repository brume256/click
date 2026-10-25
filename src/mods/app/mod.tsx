/// <reference types="chrome" />

import { WcAccount } from "@/libs/account/mod.ts";
import { InOther, WideOppositeAnchor } from "@/libs/anchor/mod.tsx";
import { InButton, WideContrastButton, WideOppositeButton } from "@/libs/button/mod.tsx";
import { Channel } from "@/libs/channel/mod.ts";
import { useCopy } from "@/libs/copy/mod.ts";
import { Errors } from "@/libs/errors/mod.ts";
import { Events } from "@/libs/events/mod.ts";
import { Outline } from "@/libs/heroicons/mod.ts";
import { Nullable } from "@/libs/nullable/mod.ts";
import { ColorAnchor, ColorBubble } from "@/mods/app/color/mod.tsx";
import { SubpathProvider, useAnchorWithCoords, useHashSubpath, usePath, usePathContext } from "@hazae41/chemin";
import { RpcMessageInit, RpcRequest } from "@hazae41/jsonrpc";
import { PathBubble, PathPrompt, PathWindow } from "@hazae41/modal";
import { useCloseContext } from "@hazae41/react-close-context";
import { QrEncoder } from "@hazae41/visage";
import React, { Fragment, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";

React;

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

export function ConnectPrompt(props: { channel: Channel } & { title: string } & { color: Nullable<string> } & { close(): void }) {
  const { channel, title, color, close: close1 } = props

  const close0 = useCloseContext().getOrThrow()

  const close = useCallback(() => {
    setTimeout(() => close0(), 0)
    setTimeout(() => close1(), 500)
  }, [close0, close1])

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

  const { copied, copyOrDisplay } = useCopy(code)

  return <div className="flex flex-col grow p-6 text-base">
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
        <button className="group rounded-full p-1 hover:bg-default-double-contrast focus-visible:bg-default-double-contrast focus-visible:outline-none"
          type="button"
          onClick={copyOrDisplay}>
          <InButton>
            {copied ? <Outline.CheckIcon className="size-5" /> : <Outline.DocumentDuplicateIcon className="size-5" />}
          </InButton>
        </button>
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
  </div>
}

export function CreateWindow(props: { channel: Channel }) {
  const { channel } = props

  const close = useCloseContext().getOrThrow()

  const path = usePathContext().getOrThrow()
  const hash = useHashSubpath(path)

  const [$title, setTitle] = useState("")

  const title = useDeferredValue($title || "Main")

  const [color, setColor] = useState<Nullable<string>>(["red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"][Math.floor(Math.random() * 16)])

  const connect = useAnchorWithCoords(hash, "/connect")

  return <div className="flex flex-col grow p-6 text-base">
    <SubpathProvider value={hash}>
      {hash.url.pathname === "/color" &&
        <PathBubble>
          <ColorBubble ok={setColor} />
        </PathBubble>}
      {hash.url.pathname === "/connect" &&
        <PathPrompt>
          <ConnectPrompt
            channel={channel}
            title={title}
            color={color}
            close={close} />
        </PathPrompt>}
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
      <div className="h-8 grow" />
      <div className="flex items-center flex-wrap-reverse gap-2">
        <WideOppositeAnchor
          onKeyDown={connect.onKeyDown}
          onClick={connect.onClick}
          href={connect.url.hash}>
          Connect
        </WideOppositeAnchor>
      </div>
    </form>
  </div>
}

export function App(props: { channel: Channel } & { location: URL }) {
  const { channel, location } = props

  const path = usePathContext().getOrThrow()

  const create = useAnchorWithCoords(path, "/create")

  const [account, setAccount] = useState<WcAccount>()

  const onMessage = useCallback((message: RpcMessageInit) => {
    if ("method" in message === false)
      return

    const request = RpcRequest.from(message)

    if (request.method === "wc_accountChanged") {
      const [account] = request.params as [WcAccount]

      setAccount(account)

      return
    }

    if (request.method === "wc_accountsChanged") {
      const accounts = request.params as WcAccount[]

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
    channel.request<WcAccount>({ method: "wc_account", params: [location] }).then(setAccount)
  }, [channel, location])

  const onConnect = useCallback((account: WcAccount) => Promise.try(async () => {
    await channel.request({ method: "wc_disconnect", params: [location] })
    await channel.request({ method: "wc_connect", params: [location, account] })
  }).catch(Errors.display), [channel, location])

  const onDisconnect = useCallback(() => Promise.try(async () => {
    await channel.request({ method: "wc_disconnect", params: [location] })
  }).catch(Errors.display), [channel, location])

  const [accounts, setAccounts] = useState<WcAccount[]>([])

  useEffect(() => {
    channel.request<WcAccount[]>({ method: "wc_accounts", params: [location] }).then(setAccounts)
  }, [channel, location])

  if (location == null)
    return null

  return <div className="h-full w-full flex flex-col items-center p-8">
    <SubpathProvider value={path}>
      {path.url.pathname === "/create" &&
        <PathWindow>
          <CreateWindow channel={channel} />
        </PathWindow>}
    </SubpathProvider>
    {!account && <Fragment>
      <div className="w-[18rem] aspect-video bg-default-contrast border-2 border-default-contrast rounded-xl flex items-center justify-center p-8 break-all overflow-y-auto" />
    </Fragment>}
    {account && <Fragment key={account.address.eip155}>
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
        data-theme={accounts.find(x => x.uuid === account.uuid)?.color == null ? "opposite" : "dark"}
        data-color={accounts.find(x => x.uuid === account.uuid)?.color}
        onClick={onDisconnect}>
        <div className="font-medium text-lg">
          {accounts.find(x => x.uuid === account.uuid)?.title}
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
        <Fragment key={x.uuid}>
          <AccountCard channel={channel} account={x} connect={onConnect} />
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

export function AccountCard(props: { channel: Channel } & { account: WcAccount } & { connect(account: WcAccount): void }) {
  const { channel, account, connect } = props

  const path = usePath()
  const hash = useHashSubpath(path)

  const onClick = useCallback(() => {
    connect(account)
  }, [connect, account])

  const remove = useAnchorWithCoords(hash, `/${account.uuid}/delete`)

  return <Fragment>
    <SubpathProvider value={hash}>
      {hash.url.pathname === `/${account.uuid}/delete` &&
        <PathPrompt>
          <DeletePrompt
            channel={channel}
            account={account} />
        </PathPrompt>}
    </SubpathProvider>
    <div className="-mt-28 z-0 w-[18rem] aspect-video bg-default text-default selection-default cursor-pointer border-2 border-default-contrast rounded-xl p-4 flex flex-col items-start hover:translate-x-3 transition-transform
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
        <div className="flex items-center gap-2"
          onClick={Events.stopPropagation}>
          <a className="group rounded-full cursor-pointer p-1 hover:bg-default-double-contrast focus-visible:bg-default-double-contrast focus-visible:outline-none"
            onKeyDown={remove.onKeyDown}
            onClick={remove.onClick}
            href={remove.url.hash}>
            <InButton>
              <Outline.TrashIcon className="size-5" />
            </InButton>
          </a>
        </div>
      </div>
    </div>
  </Fragment>
}

export function DeletePrompt(props: { channel: Channel } & { account: WcAccount }) {
  const { channel, account } = props

  const close = useCloseContext().getOrThrow()

  const onClose = useCallback(() => {
    close()
  }, [close])

  const onDelete = useCallback(() => Promise.try(async () => {
    await channel.request(new RpcRequest(crypto.randomUUID(), "wc_delete", [account]))
  }).catch(Errors.display), [channel, account])

  return <div className="flex flex-col grow p-6 text-base">
    <div className="font-medium">
      Delete
    </div>
    <div className="text-default-contrast">
      Are you sure you want to delete this account?
    </div>
    <div className="h-4" />
    <div className="flex items-center flex-wrap-reverse gap-2">
      <WideContrastButton
        onClick={onClose}>
        Cancel
      </WideContrastButton>
      <WideOppositeButton
        onClick={onDelete}>
        Delete
      </WideOppositeButton>
    </div>
  </div>
}