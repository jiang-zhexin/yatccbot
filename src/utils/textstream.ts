import { Markdown } from "./transform"

export class TextBufferTransformStream extends TransformStream<string, result> {
    private buffer
    private sendedSize: number
    private maxBufferSize: number

    constructor(maxBufferSize: number) {
        super({
            transform: (chunk, controller) => this.transform(chunk, controller),
            flush: (controller) => this.flush(controller),
        })
        this.buffer = ""
        this.sendedSize = 0
        this.maxBufferSize = maxBufferSize
    }

    private transform(chunk: string, controller: TransformStreamDefaultController<result>) {
        this.buffer += this.buffer.length ? chunk : chunk.trimStart()
        const result = Markdown(this.buffer)
        if (result.text.length - this.sendedSize > Math.min(this.sendedSize, this.maxBufferSize)) {
            this.sendedSize = result.text.length
            controller.enqueue(result)
        }
    }

    private flush(controller: TransformStreamDefaultController<result>) {
        const result = Markdown(this.buffer)
        if (result.text.length > this.sendedSize) {
            controller.enqueue(result)
        }
    }
}
