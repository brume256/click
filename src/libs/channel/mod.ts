import { RpcMessageInit, RpcRequest, RpcRequestPreinit, RpcResponse } from "@hazae41/jsonrpc";

export interface ChannelEventMap {
  message: CustomEvent<RpcMessageInit>
}

export class Channel extends EventTarget {

  #port: chrome.runtime.Port

  constructor() {
    super()

    this.#port = this.#connect()

    addEventListener("pageshow", (event) => {
      const cached = event.persisted

      if (!cached)
        return

      this.#port = this.#connect()
    }, { passive: true })

    setInterval(() => {
      this.request({ method: "ping" }).catch(console.error)
    }, 1000)

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

    const onMessage = (message: RpcMessageInit) => {
      const detail = message

      this.dispatchEvent(new CustomEvent("message", { detail }))

      return
    }

    const onDisconnect = () => {
      const error = chrome.runtime.lastError

      if (error != null)
        console.warn(error.message)

      location.reload()
    }

    port.onMessage.addListener(onMessage)

    port.onDisconnect.addListener(onDisconnect)

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

    const onDisconnect = () => {
      const error = chrome.runtime.lastError

      if (error != null)
        console.warn(error.message)

      reject(error)
    }

    this.#port.onMessage.addListener(onMessage)
    stack.defer(() => this.#port.onMessage.removeListener(onMessage))

    this.#port.onDisconnect.addListener(onDisconnect)
    stack.defer(() => this.#port.onDisconnect.removeListener(onDisconnect))

    addEventListener("pagehide", reject, { passive: true })
    stack.defer(() => removeEventListener("pagehide", reject))

    this.#port.postMessage(request)

    const response = await promise

    return response.getOrThrow() as T
  }

}