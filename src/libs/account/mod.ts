import { Nullable } from "@/libs/nullable/mod.ts";

export interface Addresses {
  readonly eip155: string
  readonly solana: string
}

export interface WalletConnectAccount {
  readonly uuid: string
  readonly type: "walletconnect"

  readonly title: string
  readonly color: Nullable<string>

  readonly address: Addresses
  readonly details: { jwk: string, tpc: string, key: string }
}