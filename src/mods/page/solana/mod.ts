// deno-lint-ignore-file no-namespace require-await no-window no-explicit-any

import { pipe } from "@/mods/page/pipe/mod.ts";
import { EventEmitter } from "events";

declare global {

  export interface Window {
    solana: Solana
  }

}

declare global {

  export interface Window {
    phantom: { solana: Solana }
  }

}

export class Solana extends EventEmitter {

  constructor() {
    super()
  }

  get isPhantom() {
    return true
  }

  async connect() {
    return Uint8Array.fromHex("37b018ef756c14309a2c1bee7f3584793f0e3ce17e6d092de57660bb6e188b0b")
  }

  async disconnect() {
    ;
  }

  async signMessage() {
    throw new Error("Not implemented")
  }

  async signTransaction() {
    throw new Error("Not implemented")
  }

}

export namespace solana {

  export const provider = new Solana()

  window.solana = provider

  window.phantom = { solana: provider }

}

export interface WalletStandardWalletInfo {
  readonly version: string

  readonly name: string
  readonly icon: string

  readonly chains: string[]

  readonly accounts: unknown[]
  readonly features: Record<string, unknown>
}

export interface WalletStandardApp {
  register(info: WalletStandardWalletInfo): void
}

declare global {

  export interface WindowEventMap {
    "wallet-standard:app-ready": CustomEvent<WalletStandardApp>
    "wallet-standard:register-wallet": CustomEvent<(app: WalletStandardApp) => void>
  }

}

export namespace wallet {

  const dummy = {
    address: "4kPAZS6jyqkotTAJB9eiPcLwhj483oQhVeMEaR7hamJS",
    publicKey: Uint8Array.fromHex("37b018ef756c14309a2c1bee7f3584793f0e3ce17e6d092de57660bb6e188b0b"),
    chains: ["solana:mainnet", "solana:devnet"],
    features: ["solana:signMessage", "solana:signTransaction"],
  }

  export const info: WalletStandardWalletInfo = {
    version: pipe.requestSync<string>({ method: "chrome_version" }),

    name: pipe.requestSync<string>({ method: "chrome_name" }),
    icon: pipe.requestSync<string>({ method: "chrome_url", params: ["/padicon.png"] }),

    chains: ["solana:mainnet", "solana:devnet"],

    accounts: [],
    features: {
      "standard:connect": {
        version: "1.0.0",
        connect: () => ({ accounts: [] })
      },
      "standard:disconnect": {
        version: "1.0.0",
        disconnect: () => { },
      },
      "standard:events": {
        version: "1.0.0",
        on: (name: string, listener: (...args: any[]) => void) => {
          window.solana.on(name, listener)
          return () => window.solana.off(name, listener)
        },
      },
      "solana:signMessage": {
        version: "1.0.0",
        signMessage: () => { throw new Error("Not implemented") },
      },
      "solana:signTransaction": {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0, 1],
        signTransaction: () => { throw new Error("Not implemented") },
      }
    }
  }

  export function announce() {
    const detail = (app: WalletStandardApp) => app.register(info)
    dispatchEvent(new CustomEvent("wallet-standard:register-wallet", { detail }))
  }

  addEventListener("wallet-standard:app-ready", (event) => {
    event.detail.register(info)
  }, { passive: true })

  announce()

}