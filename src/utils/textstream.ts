import { Markdown } from "./transform"

type onFinish = (result: result) => void | Promise<void>

export class MarkdownTransformStream extends TransformStream<string, result> {
    private buffer: string = ""
    private result: result = { text: "", entities: [] }
    private onFinish: onFinish

    constructor(onFinish: onFinish) {
        super({
            transform: (chunk, controller) => this.transform(chunk, controller),
            flush: (controller) => this.flush(controller),
        })
        this.onFinish = onFinish
    }

    private transform(chunk: string, controller: TransformStreamDefaultController<result>) {
        this.buffer += chunk
        this.result = Markdown(this.buffer)
        controller.enqueue(this.result)
    }

    private flush(controller: TransformStreamDefaultController<result>) {
        this.onFinish(this.result)
    }
}

export class TextBufferTransformStream extends TransformStream<result, result> {
    private sendedSize: number = 0
    private maxBufferSize: number

    constructor(maxBufferSize: number) {
        super({ transform: (chunk, controller) => this.transform(chunk, controller) })
        this.maxBufferSize = maxBufferSize
    }

    private transform(chunk: result, controller: TransformStreamDefaultController<result>) {
        if (chunk.text.length - this.sendedSize > Math.min(this.sendedSize, this.maxBufferSize)) {
            this.sendedSize = chunk.text.length
            controller.enqueue(chunk)
        }
    }
}
