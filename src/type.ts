import type { Context } from "grammy"
import type { MessageEntity } from "grammy/types"
import type { CoreMessage } from "ai"
import { modelMap } from "./constant"

declare global {
    type MyContext = Context & { config: BotConfig }
    type models = keyof typeof modelMap
    type modelMatedata = workersAImodel | googleAiAtudio
    type result = {
        text: string
        entities: MessageEntity[]
    }
}

interface BotConfig {
    ctx: ExecutionContext
    env: Env
    AiMessages?: CoreMessage[]
}

interface workersAImodel extends matedata {
    provider: "workers-ai"
    id: TextGenerationModels
}

interface googleAiAtudio extends matedata {
    provider: "google-ai-studio"
    id: GoogleGenerativeAIModelId
}

interface matedata {
    name: string
    stream: boolean
    useTool: boolean
    think: boolean
}

type TextGenerationModels = Exclude<value2key<AiModels, BaseAiTextGeneration>, value2key<AiModels, BaseAiTextToImage>> | (string & {})
type value2key<T, V> = { [K in keyof T]: T[K] extends V ? K : never }[keyof T]

type GoogleGenerativeAIModelId =
    | "gemini-1.5-flash"
    | "gemini-1.5-flash-latest"
    | "gemini-1.5-flash-001"
    | "gemini-1.5-flash-002"
    | "gemini-1.5-flash-8b"
    | "gemini-1.5-flash-8b-latest"
    | "gemini-1.5-flash-8b-001"
    | "gemini-1.5-pro"
    | "gemini-1.5-pro-latest"
    | "gemini-1.5-pro-001"
    | "gemini-1.5-pro-002"
    | "gemini-2.0-flash"
    | "gemini-2.0-flash-001"
    | "gemini-2.0-flash-live-001"
    | "gemini-2.0-flash-lite"
    | "gemini-2.0-pro-exp-02-05"
    | "gemini-2.0-flash-thinking-exp-01-21"
    | "gemini-2.0-flash-exp"
    | "gemini-2.5-pro-exp-03-25"
    | "gemini-2.5-pro-preview-05-06"
    | "gemini-2.5-flash-preview-04-17"
    | "gemini-exp-1206"
    | "gemma-3-27b-it"
    | "learnlm-1.5-pro-experimental"
