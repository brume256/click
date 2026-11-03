import { RpcMessageInit, RpcRequest, RpcRequestPreinit, RpcResponse } from "@hazae41/jsonrpc";

export interface ChannelEventMap {
  message: MessageEvent<RpcMessageInit>
}

export class Channel extends EventTarget {

  #port: chrome.runtime.Port

  constructor() {
    super()

    this.#port = this.#connect()

    return
  }

  override addEventListener<K extends keyof ChannelEventMap>(type: K, listener: (e: ChannelEventMap[K]) => void, options?: AddEventListenerOptions): void

  override addEventListener(type: string, callback: (e: Event) => void, options?: AddEventListenerOptions): void

  override addEventListener(type: string, callback: (e: Event) => void, options?: AddEventListenerOptions): void {
    super.addEventListener(type, callback, options)
  }

  override removeEventListener<K extends keyof ChannelEventMap>(type: K, listener: (e: ChannelEventMap[K]) => void, options?: EventListenerOptions): void

  override removeEventListener(type: string, callback: (e: Event) => void, options?: EventListenerOptions): void

  override removeEventListener(type: string, callback: (e: Event) => void, options?: EventListenerOptions): void {
    super.removeEventListener(type, callback, options)
  }

  #connect() {
    const port = chrome.runtime.connect()

    port.onMessage.addListener((message) => this.dispatchEvent(new MessageEvent("message", { data: message })))

    port.onDisconnect.addListener(() => { this.#port = this.#connect() })

    port.onDisconnect.addListener(() => console.warn("Port disconnected"))

    return port
  }

  async request<T>(init: RpcRequestPreinit) {
    using stack = new DisposableStack()

    const { method, params } = init

    const request = new RpcRequest(crypto.randomUUID(), method, params)

    const { promise, resolve, reject } = Promise.withResolvers<RpcResponse>()

    stack.defer(() => reject())
    promise.catch(() => { })

    const onMessage = (message: RpcMessageInit) => {
      if ("method" in message === true)
        return

      const response = RpcResponse.from(message)

      if (response.id !== request.id)
        return

      resolve(response)
    }

    this.#port.onMessage.addListener(onMessage)
    stack.defer(() => this.#port.onMessage.removeListener(onMessage))

    this.#port.postMessage(request)

    const response = await promise

    return response.getOrThrow() as T
  }

}