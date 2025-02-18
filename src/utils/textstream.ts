import { events } from "fetch-event-stream"

export async function ToTextStream(AiRawStream: AiTextGenerationOutput): Promise<ReadableStream<string>> {
    if (!(AiRawStream instanceof ReadableStream)) {
        throw new Error("This shouldn't happen")
    }
    const textStream = events(new Response(AiRawStream))
    return new ReadableStream({
        async start(controller) {
            for await (const event of textStream) {
                if (!event.data) {
                    continue
                }
                if (event.data === "[DONE]") {
                    controller.close()
                    return
                }
                const chunk = JSON.parse(event.data) as chunk
                chunk.response.length && controller.enqueue(chunk.response)
            }
        },
    })
}

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
            this.sendedSize += this.buffer.length
            controller.enqueue(this.buffer)
        }
    }

    private flush(controller: TransformStreamDefaultController<string>) {
        if (this.buffer.length > this.sendedSize) {
            controller.enqueue(this.buffer)
        }
    }
}

interface chunk {
    response: string
    p?: string
    usage?: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
    }
}
