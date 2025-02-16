import { Composer } from "grammy"
import telegramifyMarkdown from "telegramify-markdown"
import { ToTextStream } from "./utils/textstream"

export const chat = new Composer<MyContext>()

chat.on("message:text")
    .filter((c) => c.msg.reply_to_message?.from?.id === c.me.id)
    .filter(
        (c) => c.msg.text.startsWith("/chat") || !c.msg.text.startsWith("/"),
        async (c, next) => {
            const messages = await c.session.env.YATCC.get<messages>(`${c.msg.chat.id}-${c.msg.reply_to_message?.message_id}`, {
                type: "json",
            })
            if (!messages) {
                return await c.reply("上下文过期，请重新开始对话", { reply_parameters: { message_id: c.msg.message_id } })
            }
            messages.push({ role: "user", content: c.msg.text })
            c.session.messages = messages
            await next()
        }
    )

chat.command("chat", async (c, next) => {
    const system: messages = [{ role: "system", content: "你在 telegram 中扮演一个 Bot, 对于用户的请求，请尽量精简地解答，勿长篇大论" }]
    const messages = c.session.messages ?? system
    if (messages.length <= system.length) {
        c.msg.reply_to_message?.text && messages.push({ role: "user", content: c.msg.reply_to_message.text })
        c.match.length > 0 && messages.push({ role: "user", content: c.match })
    } else {
        messages.pop()
        c.match.length > 0 && messages.push({ role: "user", content: c.match })
    }
    if (messages.length === 0) {
        return await c.reply("请输入文字", { reply_parameters: { message_id: c.msg.message_id } })
    }
    c.session.messages = messages
    await next()
})

chat.on("message:text").filter(
    (c) => c.session.messages !== undefined,
    async (c) => {
        const model = (await c.session.env.YATCC.get<models>(`${c.msg.chat.id}-model`)) ?? "@cf/qwen/qwen1.5-14b-chat-awq"
        const result = await c.session.env.AI.run(
            model,
            {
                messages: c.session.messages,
                stream: true,
                max_tokens: 2048,
                temperature: 0.6,
            },
            { gateway: { id: "yatccbot", collectLog: true } }
        )
        c.session.ctx.waitUntil(
            (async () => {
                const textStream = await ToTextStream(result)
                const reader = textStream.getReader()
                let chunk = await reader.read()
                let textBuffer = chunk.value ?? ""
                let sendedLength = textBuffer.length
                const message = await c.reply(textBuffer, { reply_parameters: { message_id: c.msg.message_id } })
                const edit = async (textBuffer: string) => {
                    await c.api.editMessageText(message.chat.id, message.message_id, telegramifyMarkdown(textBuffer, "escape"), {
                        parse_mode: "MarkdownV2",
                    })
                }
                while ((chunk = await reader.read()).value) {
                    textBuffer += chunk.value
                    if (textBuffer.length - sendedLength > Math.min(sendedLength, 16)) {
                        await edit(textBuffer)
                        sendedLength = textBuffer.length
                    }
                }
                if (textBuffer.length - sendedLength > 0) {
                    await edit(textBuffer)
                }
                c.session.messages?.push({ role: "assistant", content: textBuffer })
                await c.session.env.YATCC.put(`${message.chat.id}-${message.message_id}`, JSON.stringify(c.session.messages), {
                    expirationTtl: 60 * 60 * 24 * 7,
                })
            })()
        )
    }
)
