import { Composer } from "grammy"
import { streamText } from "ai"
import { Markdown } from "./utils/transform"
import { createWorkersAI } from "./ai-provider"
import { TextBufferTransformStream } from "./utils/textstream"

export const chat = new Composer<MyContext>()
const system: message = { role: "system", content: "你在 telegram 中扮演一个 Bot, 对于用户的请求，请尽量精简地解答，勿长篇大论" }

chat.on("message:text")
    .filter((c) => c.msg.reply_to_message?.from?.id === c.me.id)
    .filter((c) => c.msg.text.length > 2) // 短信息很可能不是询问 LLM
    .filter((c) => !c.msg.text.startsWith("/"))
    .use(async (c, next) => {
        const messages = await c.session.env.YATCC.get<message[]>(`${c.msg.chat.id}-${c.msg.reply_to_message?.message_id}`, {
            type: "json",
        })
        if (!messages) {
            return await c.reply("上下文过期，请重新开始对话", { reply_parameters: { message_id: c.msg.message_id } })
        }
        messages.unshift(system)
        messages.push({ role: "user", content: c.msg.text })
        c.session.messages = messages
        await next()
    })

chat.command("chat", async (c, next) => {
    const messages = [system]
    if (c.msg.reply_to_message?.quote?.text) {
        messages.push({ role: "user", content: c.msg.reply_to_message.quote.text })
    } else {
        if (c.msg.reply_to_message?.text) messages.push({ role: "user", content: c.msg.reply_to_message.text })
    }
    if (c.match.length > 0) messages.push({ role: "user", content: c.match })
    if (messages.length === 1) {
        return await c.reply("请输入文字", { reply_parameters: { message_id: c.msg.message_id } })
    }
    c.session.messages = messages
    await next()
})

chat.on("message:text").filter(
    (c) => c.session.messages !== undefined,
    async (c) => {
        const model = (await c.session.env.YATCC.get<models>(`${c.msg.chat.id}-model`)) ?? "@cf/qwen/qwen1.5-14b-chat-awq"
        const workersAI = createWorkersAI({ binding: c.session.env.AI, gateway: { id: "yatccbot", collectLog: true } })
        const result = streamText({
            model: workersAI(model),
            messages: c.session.messages,
            maxTokens: 2048,
            temperature: 0.6,
        })
        const message = await c.reply("...", { reply_parameters: { message_id: c.msg.message_id } })
        const edit = (textBuffer: string) => {
            const result = Markdown(textBuffer)
            return c.api.editMessageText(message.chat.id, message.message_id, result.text, { entities: result.entities })
        }
        c.session.ctx.waitUntil(
            result.textStream.pipeThrough(new TextBufferTransformStream(32)).pipeTo(
                new WritableStream({
                    async write(chunk: string, controller) {
                        await edit(chunk)
                    },
                    async close() {
                        c.session.messages?.push({
                            role: "assistant",
                            content: Markdown(await result.text).text,
                        })
                        c.session.messages?.shift()
                        await c.session.env.YATCC.put(`${message.chat.id}-${message.message_id}`, JSON.stringify(c.session.messages), {
                            expirationTtl: 60 * 60 * 24 * 7,
                        })
                    },
                })
            )
        )
    }
)
