/// <reference types="chrome" />

import { Outline } from "@/libs/heroicons/mod.ts";
import React from "react";

React;

export function App() {

  return <div className="h-full w-full flex flex-col items-center p-8">
    <div className="w-[min(20rem,100%)] aspect-video bg-default text-default selection-default rounded-xl font-medium p-4 flex flex-col items-start"
      data-theme="opposite">
      <div className="">
        Vitalik
      </div>
      <div className="grow" />
      <div className="bg-default-contrast rounded-full po-1 flex items-center gap-2">
        <Outline.LinkIcon className="size-5" />
        WalletConnect
      </div>
    </div>
    <div className="h-4" />
    <div className="w-[min(20rem,100%)] aspect-video border-2 border-default-contrast border-dashed rounded-xl flex items-center justify-center">
      <Outline.PlusIcon className="size-8" />
    </div>
  </div>
}

