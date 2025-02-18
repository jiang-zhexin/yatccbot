export class TextBufferTransformStream extends TransformStream<string, string> {
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

    private transform(chunk: string, controller: TransformStreamDefaultController<string>) {
        this.buffer += chunk
        if (this.buffer.length - this.sendedSize >= Math.min(this.sendedSize, this.maxBufferSize)) {
            this.sendedSize = this.buffer.length
            controller.enqueue(this.buffer)
        }
    }

    private flush(controller: TransformStreamDefaultController<string>) {
        if (this.buffer.length > this.sendedSize) {
            controller.enqueue(this.buffer)
        }
    }
}
