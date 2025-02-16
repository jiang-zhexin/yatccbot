import type { Context, SessionFlavor } from "grammy"
import type { Message } from "ai"

interface SessionData {
    ctx: ExecutionContext
    env: Env
    messages?: message[]
}

declare global {
    type message = Omit<Message, "id">
    type MyContext = Context & SessionFlavor<SessionData>
}
