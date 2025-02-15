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

interface chunk {
    response: string
    p?: string
    usage?: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
    }
}
