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

  reconnect() {
    this.#port?.disconnect?.()

    this.#port = this.#connect()

    return
  }

  #connect() {
    const port = chrome.runtime.connect()

    /**
     * Pass messages coming from the service worker
     */
    port.onMessage.addListener((message) => this.dispatchEvent(new MessageEvent("message", { data: message })))

    /**
     * Reload the page when the extension is reloaded
     */
    port.onDisconnect.addListener(() => location.reload())

    return port
  }

  async request<T>(init: RpcRequestPreinit) {
    using stack = new DisposableStack()

    const { method, params } = init

    const request = new RpcRequest(crypto.randomUUID(), method, params)

    const { promise, resolve, reject } = Promise.withResolvers<RpcResponse>()

    stack.defer(() => reject())
    promise.catch(() => { })

    const onMessage = (event: MessageEvent<RpcMessageInit>) => {
      const message = event.data

      if ("method" in message === true)
        return

      const response = RpcResponse.from(message)

      if (response.id !== request.id)
        return

      resolve(response)
    }

    this.addEventListener("message", onMessage, { passive: true })
    stack.defer(() => this.removeEventListener("message", onMessage))

    this.#port.postMessage(request)

    const response = await promise

    return response.getOrThrow() as T
  }

}