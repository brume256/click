import { RpcCounter, RpcRequestPreinit } from "@hazae41/jsonrpc";

interface EIP1193Provider { }

interface EIP6963ProviderInfo {
  readonly uuid: string;
  readonly name: string;
  readonly icon: string;
  readonly rdns: string;
}

interface EIP6963ProviderDetail {
  readonly info: EIP6963ProviderInfo;
  readonly provider: EIP1193Provider;
}

interface EIP6963AnnounceProviderEvent extends CustomEvent {
  readonly type: "eip6963:announceProvider";
  readonly detail: EIP6963ProviderDetail;
}

interface EIP6963RequestProviderEvent extends CustomEvent {
  readonly type: "eip6963:requestProvider";
}

declare global {
  interface DedicatedWorkerGlobalScopeEventMap {
    "eip6963:announceProvider": EIP6963AnnounceProviderEvent,
    "eip6963:requestProvider": EIP6963RequestProviderEvent
  }
}

class Ethereum extends EventTarget {

  readonly counter = new RpcCounter()

  constructor() {
    super()
  }

  async request<T>(init: RpcRequestPreinit<unknown>) {
    console.log("->", init)

    const request = this.counter.prepare(init)

    if (request.method === "eth_chainId")
      return "0x1"
    if (request.method === "eth_accounts")
      return ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"]

    throw new Error("Unimplemented")
  }

  on(event: string, listener: EventListenerOrEventListenerObject) {
    console.log("on", event, listener)
  }


}

const info: EIP6963ProviderInfo = Object.freeze({
  uuid: "e750a98c-ff2d-4fc4-b6e2-faf4d13d1add",
  name: "Brume Click",
  icon: "https://brume.tech/appicon.png",
  rdns: "tech.brume"
})

// const provider = new Ethereum()

const provider = new Proxy(new Ethereum(), {
  get(target, prop, receiver) {
    console.log("get", prop)
    return Reflect.get(target, prop, receiver)
  }
})

function announce() {
  const detail: EIP6963ProviderDetail = Object.freeze({ info, provider })
  dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail }))
}

addEventListener("eip6963:requestProvider", announce, { passive: true })

announce()