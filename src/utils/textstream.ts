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
    private lastchunk?: result

    constructor(maxBufferSize: number) {
        super({
            transform: (chunk, controller) => this.transform(chunk, controller),
            flush: (controller) => this.flush(controller),
        })
        this.maxBufferSize = maxBufferSize
    }

    private transform(chunk: result, controller: TransformStreamDefaultController<result>) {
        this.lastchunk = chunk
        if (chunk.text.length - this.sendedSize > Math.min(this.sendedSize, this.maxBufferSize)) {
            this.sendedSize = chunk.text.length
            controller.enqueue(chunk)
        }
    }

    private flush(controller: TransformStreamDefaultController<result>) {
        if (this.lastchunk?.text?.length ?? 0 > this.sendedSize) {
            controller.enqueue(this.lastchunk)
        }
    }
}
