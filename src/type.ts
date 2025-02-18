import type { Context, SessionFlavor } from "grammy"
import type { CoreMessage } from "ai"
import { modelMap } from "./constant"

interface SessionData {
    ctx: ExecutionContext
    env: Env
    messages?: CoreMessage[]
}

type filter<T, U> = { [K in keyof T]: T[K] extends U ? K : never }[keyof T]

declare global {
    type MyContext = Context & SessionFlavor<SessionData>
    type BaseAiTextGenerationModels = Exclude<filter<AiModels, BaseAiTextGeneration>, filter<AiModels, BaseAiTextToImage>>
    type models = keyof typeof modelMap
}
