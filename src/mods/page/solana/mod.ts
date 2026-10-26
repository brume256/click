// deno-lint-ignore-file no-namespace require-await no-explicit-any no-unused-vars no-window

import { icon } from "@/libs/icon/mod.ts";
import { Nullable } from "@/libs/nullable/mod.ts";
import { pipe } from "@/mods/page/pipe/mod.ts";
import { base58 } from "@hazae41/base58";
import { RpcInternalError } from "@hazae41/jsonrpc";
import { BN } from "bn.js";
import { Buffer } from "buffer";
import { EventEmitter } from "events";

declare global {

  export interface Window {
    solana: Provider
  }

}

declare global {

  export interface Window {
    phantom: { solana: Provider }
  }

}

export interface Account {
  readonly address: string
  readonly publicKey: Uint8Array
  readonly chains: string[]
  readonly features: string[]
}

export class PublicKey {

  readonly #publicKeyAsBytes: Uint8Array
  readonly #publicKeyAsBN: BN

  constructor(
    readonly publicKeyAsBase58: string
  ) {
    this.#publicKeyAsBytes = base58.decode(this.publicKeyAsBase58)
    this.#publicKeyAsBN = new BN(this.#publicKeyAsBytes)
  }

  get _bn() {
    return this.#publicKeyAsBN
  }

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
    return this.#publicKeyAsBytes
  }

  toBuffer() {
    const { buffer, byteOffset, byteLength } = this.toBytes()
    return Buffer.from(buffer, byteOffset, byteLength)
  }

  equals(other: PublicKey) {
    return this.toString() === other.toString()
  }

}

export interface VersionedTransactionLike {

  readonly version: number

  readonly signatures: Uint8Array[]

  serialize(): Uint8Array

  addSignature(publicKey: PublicKey, signature: Uint8Array): void

}

export class Provider extends EventEmitter {

  publicKey: Nullable<PublicKey> = null

  constructor() {
    super()

    addEventListener("pipe:message", (event) => {
      const { detail: request } = event

      if (request.method === "solana_connect") {
        const [address] = request.params as string[]

        const publicKey = new PublicKey(address)

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

  async connect(params: { onlyIfTrusted?: boolean } = {}): Promise<{ publicKey: PublicKey }> {
    const [address] = await pipe.request<string[]>({ method: "solana_connect", params })

    const publicKey = new PublicKey(address)

    this.publicKey = publicKey

    return { publicKey }
  }

  async disconnect() {
    await pipe.request<string[]>({ method: "solana_disconnect" })

    this.publicKey = null

    return
  }

  async signMessage(message: Uint8Array) {
    if (this.publicKey == null)
      await this.connect({ onlyIfTrusted: false })
    if (this.publicKey == null)
      throw new RpcInternalError()

    const message58 = base58.encode(message)
    const pubkey58 = this.publicKey?.toString()

    const params = { message: message58, pubkey: pubkey58 }
    const result = await pipe.request<{ signature: string }>({ method: "solana_signMessage", params })

    const signature = base58.decode(result.signature)

    return { signature, publicKey: this.publicKey }
  }

  async signTransaction(transaction: VersionedTransactionLike) {
    if (this.publicKey == null)
      await this.connect({ onlyIfTrusted: false })
    if (this.publicKey == null)
      throw new RpcInternalError()

    const params = { transaction: transaction.serialize().toBase64() }
    const result = await pipe.request<{ signature: string }>({ method: "solana_signTransaction", params })

    const signature = base58.decode(result.signature)

    transaction.addSignature(this.publicKey, signature)

    return transaction
  }

}

export interface WalletLike {
  version: string

  name: string
  icon: string

  chains: string[]

  accounts: unknown[]

  features: Record<string, unknown>
}

export class WalletAccount {

  readonly publicKey: Uint8Array

  readonly chains = ["solana:mainnet", "solana:devnet"]
  readonly features = ["solana:signMessage", "solana:signTransaction"]

  constructor(
    readonly address: string
  ) {
    this.publicKey = base58.decode(address)
  }

}

export interface WalletAppLike {
  register(wallet: WalletLike): void
}

declare global {

  export interface WindowEventMap {
    "wallet-standard:app-ready": CustomEvent<WalletAppLike>
    "wallet-standard:register-wallet": CustomEvent<(app: WalletAppLike) => void>
  }

}

export const provider = new Provider()

window.solana = provider

window.phantom = { solana: provider }

export async function connect(props: { silent?: boolean } = {}) {
  const { silent } = props

  const params = { onlyIfTrusted: silent }
  const result = await pipe.request<string[]>({ method: "solana_connect", params })

  const accounts = result.map(address => new WalletAccount(address))

  wallet.accounts = accounts

  return { accounts }
}

export async function disconnect() {
  await pipe.request({ method: "solana_disconnect" })

  wallet.accounts = []

  return
}

export async function signMessage(props: { account: WalletAccount, message: Uint8Array }) {
  const { account, message } = props

  const message58 = base58.encode(message)
  const pubkey58 = base58.encode(account.publicKey)

  const params = { message: message58, pubkey: pubkey58 }
  const result = await pipe.request<{ signature: string }>({ method: "solana_signMessage", params })

  const signature = base58.decode(result.signature)

  // TODO fix

  return { signature, signedMessage: message, signatureType: "ed25519" }
}

export async function signTransaction() {
  throw new Error("Not implemented")
}

export const wallet: WalletLike = {
  version: "1.0.0",

  name: pipe.requestSync<string>({ method: "chrome_name" }),
  icon: icon,

  chains: ["solana:mainnet", "solana:devnet"],

  accounts: [],

  features: {
    "standard:connect": {
      version: "1.0.0",
      connect
    },
    "standard:disconnect": {
      version: "1.0.0",
      disconnect
    },
    "standard:events": {
      version: "1.0.0",
      on: (name: string, listener: (...args: any[]) => void) => {
        // TODO
        provider.on(name, listener)
        return () => provider.off(name, listener)
      },
    },
    "solana:signMessage": {
      version: "1.0.0",
      signMessage
    },
    "solana:signTransaction": {
      version: "1.0.0",
      supportedTransactionVersions: ["legacy", 0, 1],
      signTransaction
    }
  }
}

export function announce() {
  const detail = (app: WalletAppLike) => app.register(wallet)
  dispatchEvent(new CustomEvent("wallet-standard:register-wallet", { detail }))
}

addEventListener("wallet-standard:app-ready", (event) => {
  event.detail.register(wallet)
}, { passive: true })

announce()