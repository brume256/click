import { RpcMessageInit, RpcRequest, RpcRequestPreinit, RpcResponse } from "@hazae41/jsonrpc";

export class Channel {

  constructor(
    readonly port: chrome.runtime.Port
  ) { }

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

    this.port.onMessage.addListener(onMessage)
    stack.defer(() => this.port.onMessage.removeListener(onMessage))

    this.port.postMessage(request)

    const response = await promise

    return response.getOrThrow() as T
  }

}