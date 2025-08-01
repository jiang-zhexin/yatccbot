import { Composer } from "grammy"
import type { MessageEntity } from "@grammyjs/types"
import { type CoreMessage, streamText } from "ai"
import { env } from "cloudflare:workers"

import { MarkdownTransformStream, TextBufferTransformStream } from "./utils/textstream"
import { ChooseModel } from "./utils/choosemodel"
import { defaultModel, modelMap } from "./constant"

export const chat = new Composer<MyContext>()
const system: CoreMessage = {
    role: "system",
    content:
        "你在 telegram 中扮演一个 Bot, 对于用户的请求，请尽量精简地解答，勿长篇大论。由于你在群聊中，所以如果有连续两条来自用户的消息，它们很可能出自不同人之口。",
}

chat.on("message:text")
    .filter((c) => c.msg.reply_to_message?.from?.id === c.me.id)
    .filter((c) => c.msg.text.length > 2) // 短信息很可能不是询问 LLM
    .filter((c) => !c.msg.text.startsWith("/"))
    .use(async (c, next) => {
        const AiMessages =
            (await env.YATCC.get<CoreMessage[]>(`${c.msg.chat.id}-${c.msg.reply_to_message?.message_id}`, {
                type: "json",
            })) ?? []
        AiMessages.unshift(system)
        AiMessages.push({ role: "user", content: c.msg.text })
        c.config = { AiMessages }
        await next()
    })

chat.command("chat", async (c, next) => {
    const AiMessages: CoreMessage[] = [system]
    if (c.msg.reply_to_message?.quote?.text) {
        AiMessages.push({ role: "user", content: c.msg.reply_to_message.quote.text })
    } else {
        if (c.msg.reply_to_message?.text) AiMessages.push({ role: "user", content: c.msg.reply_to_message.text })
    }
    if (c.match.length > 0) AiMessages.push({ role: "user", content: c.match })
    if (AiMessages.length === 1) {
        return await c.reply("请输入文字", { reply_parameters: { message_id: c.msg.message_id } })
    }
    c.config = { AiMessages }
    await next()
})

chat.on("message:text").filter(
    (c) => c.config?.AiMessages !== undefined,
    async (c) => {
        const { AiMessages } = c.config
        const ctx = globalThis.executionContext

        const modelMatedata = modelMap[(await env.YATCC.get<models>(`${c.msg.chat.id}-model`)) ?? defaultModel]
        const model = ChooseModel(env, modelMatedata)

        const replyMessage = await c.reply("处理中...", { reply_parameters: { message_id: c.msg.message_id } })

        let edit = (text: string, entities?: MessageEntity[]) =>
            c.api.editMessageText(replyMessage.chat.id, replyMessage.message_id, text, { entities })

        const result = streamText({
            model: model,
            messages: AiMessages,
            maxTokens: 2048,
            temperature: 0.6,
            onError: async ({ error }) => {
                await edit(String(error))
                throw error
            },
        })

        const streamEdit = new WritableStream<result>({
            async write(chunk: result, controller) {
                await edit(chunk.text, chunk.entities)
            },
        })

        const SaveContext = async (result: result) => {
            AiMessages?.push({ role: "assistant", content: result.text })
            AiMessages?.shift()
            ctx.waitUntil(
                env.YATCC.put(`${replyMessage.chat.id}-${replyMessage.message_id}`, JSON.stringify(AiMessages), {
                    expirationTtl: 60 * 60 * 24 * 7,
                })
            )
        }

        ctx.waitUntil(
            result.textStream
                .pipeThrough(new MarkdownTransformStream(SaveContext))
                .pipeThrough(new TextBufferTransformStream(64))
                .pipeTo(streamEdit)
        )
    }
)
