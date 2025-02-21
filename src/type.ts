import type { Context } from "grammy"
import type { CoreMessage } from "ai"
import { modelMap } from "./constant"
import { TextGenerationModels } from "./ai-provider/workersai-models"

declare global {
    type MyContext = Context & { config: BotConfig }
    type models = keyof typeof modelMap
    type modelMatedata = workersAImodel | googleAiAtudio
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
}

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
    | "gemini-2.0-flash-001"
    | "gemini-2.0-flash-lite-preview-02-05"
    | "gemini-2.0-pro-exp-02-05"
    | "gemini-2.0-flash-thinking-exp-01-21"
    | "gemini-2.0-flash-exp"
    | "gemini-exp-1206"
    | "learnlm-1.5-pro-experimental"
