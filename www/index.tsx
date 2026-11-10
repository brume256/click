/// <reference lib="dom" />

import "@hazae41/symbol-dispose-polyfill";

import "@hazae41/disposable-stack-polyfill";

import "@hazae41/request-idle-callback-polyfill";

import { Channel } from "@/libs/channel/mod.ts";
import { dirs, Lang } from "@/libs/lang/mod.ts";
import { App } from "@/mods/app/mod.tsx";
import { PathProvider, useHashPath } from "@hazae41/chemin";
import { ClientProvider, useClient } from "@hazae41/react-client-context";
import { Rewind } from "@hazae41/rewind";
import React, { useEffect, useMemo } from "react";
import { hydrateRoot } from "react-dom/client";

React;

function Body() {
  const client = useClient()

  const path = useHashPath()

  useEffect(() => {
    const lang = Lang.get()

    document.documentElement.lang = lang
    document.documentElement.dir = dirs[lang]

    return
  }, [])

  const channel = useMemo(() => {
    return new Channel()
  }, [])

  if (!client)
    return null

  return <ClientProvider value={client}>
    <PathProvider value={path}>
      <div className="h-full w-full overflow-y-auto animate-opacity-in text-base">
        <App channel={channel} />
      </div>
    </PathProvider>
  </ClientProvider>
}

if (process.env.PLATFORM === "browser") {
  await new Rewind(document).render().then(() => hydrateRoot(document.body, <Body />))
} else {
  console.debug("Static generation skipped")
}