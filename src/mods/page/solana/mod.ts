// deno-lint-ignore-file no-namespace require-await no-window no-explicit-any

import { Nullable } from "@/libs/nullable/mod.ts";
import { pipe } from "@/mods/page/pipe/mod.ts";
import { base58 } from "@hazae41/base58";
import { Buffer } from "buffer";
import { EventEmitter } from "events";

declare global {

  export interface Window {
    solana: SolanaProvider
  }

}

declare global {

  export interface Window {
    phantom: { solana: SolanaProvider }
  }

}

export interface SolanaAccount {
  readonly address: string
  readonly publicKey: Uint8Array
  readonly chains: string[]
  readonly features: string[]
}

export class SolanaPublicKey {

  constructor(
    readonly publicKeyAsBase58: string
  ) { }

  toBase58() {
    return this.publicKeyAsBase58
  }

  toString() {
    return this.publicKeyAsBase58
  }

  toJSON() {
    return this.publicKeyAsBase58
  }

  toBytes() {
    return base58.decode(this.publicKeyAsBase58)
  }

  toBuffer() {
    const { buffer, byteOffset, byteLength } = this.toBytes()
    return Buffer.from(buffer, byteOffset, byteLength)
  }

  equals(other: SolanaPublicKey) {
    return this.publicKeyAsBase58 === other.publicKeyAsBase58
  }

  encode() {
    throw new Error("Not implemented")
  }

}

export class SolanaProvider extends EventEmitter {

  #current: Nullable<SolanaPublicKey>

  constructor() {
    super()

    addEventListener("pipe:message", (event) => {
      const { detail: request } = event

      return
    }, { passive: true })

    return
  }

  get isPhantom() {
    return true
  }

  get isConnected() {
    return this.#current != null
  }

  get publicKey() {
    return this.#current
  }

  async connect() {
    const publicKey = new SolanaPublicKey(await pipe.request<string>({ method: "connect" }))

    this.#current = publicKey

    this.emit("connect")

    return publicKey
  }

  async disconnect() {
    this.#current = null

    this.emit("disconnect")

    return
  }

  async signMessage() {
    throw new Error("Not implemented")
  }

  async signTransaction() {
    throw new Error("Not implemented")
  }

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

  export const provider = new SolanaProvider()

  window.solana = provider

  window.phantom = { solana: provider }

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
        connect: () => provider.connect()
      },
      "standard:disconnect": {
        version: "1.0.0",
        disconnect: () => provider.disconnect(),
      },
      "standard:events": {
        version: "1.0.0",
        on: (name: string, listener: (...args: any[]) => void) => {
          provider.on(name, listener)
          return () => provider.off(name, listener)
        },
      },
      "solana:signMessage": {
        version: "1.0.0",
        signMessage: () => provider.signMessage(),
      },
      "solana:signTransaction": {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0, 1],
        signTransaction: () => provider.signTransaction(),
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