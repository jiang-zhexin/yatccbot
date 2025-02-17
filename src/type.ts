import type { Context, SessionFlavor } from "grammy"
import type { Message } from "ai"

interface SessionData {
    ctx: ExecutionContext
    env: Env
    messages?: message[]
}

type filter<T, U> = { [K in keyof T]: T[K] extends U ? K : never }[keyof T]

declare global {
    type message = Omit<Message, "id">
    type MyContext = Context & SessionFlavor<SessionData>
    type BaseAiTextGenerationModels = filter<AiModels, BaseAiTextGeneration>
}
