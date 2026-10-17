// deno-lint-ignore-file no-namespace

import { icon } from "@/libs/icon/mod.ts";
import { eip1193, Ethereum } from "@/mods/page/eip1193/mod.ts";
import { pipe } from "@/mods/page/pipe/mod.ts";

declare global {

  export interface WindowEventMap {
    "eip6963:announceProvider": EIP6963AnnounceProviderEvent
    "eip6963:requestProvider": EIP6963RequestProviderEvent
  }

}

export interface EIP6963ProviderInfo {
  readonly uuid: string
  readonly name: string
  readonly icon: string
  readonly rdns: string
}

export interface EIP6963ProviderDetail {
  readonly info: EIP6963ProviderInfo
  readonly provider: Ethereum
}

export interface EIP6963AnnounceProviderEvent extends CustomEvent {
  readonly type: "eip6963:announceProvider"
  readonly detail: EIP6963ProviderDetail
}

export interface EIP6963RequestProviderEvent extends CustomEvent {
  readonly type: "eip6963:requestProvider"
}

export namespace eip6963 {

  export const info: EIP6963ProviderInfo = {
    uuid: pipe.requestSync<string>({ method: "eip6963_uuid" }),
    rdns: pipe.requestSync<string>({ method: "eip6963_rdns" }),
    name: pipe.requestSync<string>({ method: "chrome_name" }),
    icon: icon
  }

  export function announce() {
    const detail: EIP6963ProviderDetail = { info, provider: eip1193.provider }
    dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail }))
  }

  addEventListener("eip6963:requestProvider", () => {
    announce()
  }, { passive: true })

  announce()

}