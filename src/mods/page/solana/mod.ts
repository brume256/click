// deno-lint-ignore-file no-namespace require-await no-explicit-any no-unused-vars no-window

import { icon } from "@/libs/icon/mod.ts";
import { Nullable } from "@/libs/nullable/mod.ts";
import { pipe } from "@/mods/page/pipe/mod.ts";
import { base58 } from "@hazae41/base58";
import { RpcMethodNotFoundError, RpcRequestPreinit } from "@hazae41/jsonrpc";
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
    return this.toString() === other.toString()
  }

  encode() {
    throw new Error("Not implemented")
  }

}

export class SolanaProvider extends EventEmitter {

  publicKey: Nullable<SolanaPublicKey> = null

  constructor() {
    super()

    addEventListener("pipe:message", (event) => {
      const { detail: request } = event

      if (request.method === "solana_connect") {
        const [address] = request.params as string[]

        const publicKey = new SolanaPublicKey(address)

        this.publicKey = publicKey

        this.emit("connect", publicKey)

        return
      }

      if (request.method === "solana_disconnect") {
        this.publicKey = null

        this.emit("disconnect")

        return
      }

      return
    }, { passive: true })

    return
  }

  get isPhantom() {
    return true
  }

  get isConnected() {
    return this.publicKey != null
  }

  async request(init: RpcRequestPreinit<any>) {
    const { method, params } = init

    if (method === "connect")
      return await this.connect(params)
    if (method === "disconnect")
      return await this.disconnect()

    if (method === "signMessage") {
      const { message, display } = params

      const signature = await this.signMessage(message, display)

      return signature
    }

    throw new RpcMethodNotFoundError()
  }

  async connect(params: { onlyIfTrusted?: boolean } = {}): Promise<{ publicKey: SolanaPublicKey }> {
    const [address] = await pipe.request<string[]>({ method: "solana_connect", params })

    const publicKey = new SolanaPublicKey(address)

    this.publicKey = publicKey

    return { publicKey }
  }

  async disconnect() {
    this.publicKey = null

    this.emit("disconnect")

    return
  }

  async signMessage(message: Uint8Array, display?: "utf8" | "hex") {
    const { publicKey } = this

    const message58 = base58.encode(message)
    const pubkey58 = this.publicKey?.toString()

    const params = { message: message58, pubkey: pubkey58 }
    const result = await pipe.request<{ signature: string }>({ method: "solana_signMessage", params })

    const signature = base58.decode(result.signature)

    return { signature, publicKey }
  }

  async signTransaction(transaction: unknown) {
    throw new Error("Not implemented")
  }

}

export interface Wallet {
  readonly version: string

  readonly name: string
  readonly icon: string

  readonly chains: string[]

  readonly accounts: unknown[]
  readonly features: Record<string, unknown>
}

export interface WalletAccount {
  readonly address: string
  readonly publicKey: Uint8Array
  readonly chains: string[]
  readonly features: string[]
  readonly label?: string
  readonly icon?: string
}

export interface WalletApp {
  register(wallet: Wallet): void
}

declare global {

  export interface WindowEventMap {
    "wallet-standard:app-ready": CustomEvent<WalletApp>
    "wallet-standard:register-wallet": CustomEvent<(app: WalletApp) => void>
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

  export const wallet: Wallet = {
    version: "1.0.0",

    name: pipe.requestSync<string>({ method: "chrome_name" }),
    icon: icon,

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
        signMessage: (params: { account: WalletAccount, message: Uint8Array }) => {
          const { account, message } = params
          throw new Error("Not implemented")
        },
      },
      "solana:signTransaction": {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0, 1],
        signTransaction: () => {
          throw new Error("Not implemented")
        },
      }
    }
  }

  export function announce() {
    const detail = (app: WalletApp) => app.register(wallet)
    dispatchEvent(new CustomEvent("wallet-standard:register-wallet", { detail }))
  }

  // addEventListener("wallet-standard:app-ready", (event) => {
  //   event.detail.register(wallet)
  // }, { passive: true })

  // announce()

}