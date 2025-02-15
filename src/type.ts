import type { Context, SessionFlavor } from "grammy"
import type { Message } from "ai"

interface SessionData {
    ctx: ExecutionContext
    env: Env
    messages?: messages
}

declare global {
    type messages = Omit<Message, "id">[]
    type MyContext = Context & SessionFlavor<SessionData>
}
