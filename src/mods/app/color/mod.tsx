import { InOther } from "@/libs/anchor/mod.tsx";
import { InButton } from "@/libs/button/mod.tsx";
import { Nullable } from "@/libs/nullable/mod.ts";
import { useAnchorWithCoords, useHashSubpath, usePathContext } from "@hazae41/chemin";
import React, { Fragment } from "react";

React;

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

export function ColorBubble(props: { ok(color: Nullable<string>): void }) {
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