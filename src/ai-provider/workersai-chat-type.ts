export interface GenerateResult {
    response: null | string
    tool_calls?: {
        name: string
        arguments: Record<string, unknown>
    }[]
    usage: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
    }
}

export interface StreamChunk {
    response: string
    p?: string
    usage?: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
    }
}
