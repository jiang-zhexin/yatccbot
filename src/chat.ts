import { Composer } from "grammy"
import { type CoreMessage, generateText, streamText } from "ai"

import { Markdown } from "./utils/transform"
import { TextBufferTransformStream } from "./utils/textstream"
import { ChooseModel } from "./utils/choosemodel"
import { getWebsiteContent } from "./tool/getWebsiteContent"
import { modelMap } from "./constant"

export const chat = new Composer<MyContext>()
const system: CoreMessage = {
    role: "system",
    content:
        "你在 telegram 中扮演一个 Bot, 对于用户的请求，请尽量精简地解答，勿长篇大论。由于你在群聊中，所以如果有连续两条来自用户的消息，它们很可能出自不同人之口。客观中立的言论在群聊中可能不适用，人们更喜欢打趣的说法",
}

chat.on("message:text")
    .filter((c) => c.msg.reply_to_message?.from?.id === c.me.id)
    .filter((c) => c.msg.text.length > 2) // 短信息很可能不是询问 LLM
    .filter((c) => !c.msg.text.startsWith("/"))
    .use(async (c, next) => {
        const messages =
            (await c.session.env.YATCC.get<CoreMessage[]>(`${c.msg.chat.id}-${c.msg.reply_to_message?.message_id}`, {
                type: "json",
            })) ?? []
        messages.unshift(system)
        messages.push({ role: "user", content: c.msg.text })
        c.session.messages = messages
        await next()
    })

chat.command("chat", async (c, next) => {
    const messages: CoreMessage[] = [system]
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
        const useTool = (() => {
            const hasUrl = c.msg.entities?.findIndex((e) => e.type === "url" || e.type === "text_link")
            if (hasUrl !== undefined && hasUrl >= 0) {
                return getWebsiteContent
            }
            return undefined
        })()
        const modelMatedata = modelMap[(await c.session.env.YATCC.get<models>(`${c.msg.chat.id}-model`)) ?? "@cf/qwen/qwen1.5-14b-chat-awq"]
        const model = ChooseModel(c.session.env, modelMatedata)

        const message = await c.reply("处理中...", { reply_parameters: { message_id: c.msg.message_id } })
        const edit = async (textBuffer: string) => {
            const result = Markdown(textBuffer)
            await c.api.editMessageText(message.chat.id, message.message_id, result.text, { entities: result.entities })
            return result
        }
        if (modelMatedata.useTool && useTool) {
            edit("调用函数中...")
            await generateText({
                model: model,
                messages: c.session.messages,
                maxTokens: 2048,
                temperature: 0.6,
                tools: { useTool },
                onStepFinish: (result) => {
                    if (result.finishReason === "tool-calls") {
                        edit("调用函数成功，等待生成...")
                        c.session.messages?.push(...result.response.messages)
                    }
                },
            }).catch((err) => {
                console.log(err)
                c.session.ctx.waitUntil(edit("函数调用发生错误! "))
                throw err
            })
        }
        const saveContext = (assistant: string) => {
            c.session.messages?.push({ role: "assistant", content: assistant })
            c.session.messages?.shift()
            return c.session.env.YATCC.put(`${message.chat.id}-${message.message_id}`, JSON.stringify(c.session.messages), {
                expirationTtl: 60 * 60 * 24 * 7,
            })
        }
        if (!modelMatedata.stream) {
            edit("该模型不支持流式，等待时间较长...")
            c.session.ctx.waitUntil(
                generateText({
                    model: model,
                    messages: c.session.messages,
                    maxTokens: 2048,
                    temperature: 0.6,
                    onStepFinish: async (result) => {
                        const rawText = await edit(result.text)
                        await saveContext(rawText.text)
                    },
                })
            )
        } else {
            const result = streamText({
                model: model,
                messages: c.session.messages,
                maxTokens: 2048,
                temperature: 0.6,
                onFinish: async (result) => {
                    const rawText = Markdown(result.text).text
                    await saveContext(rawText)
                },
            })
            const streamEdit = new WritableStream({
                async write(chunk: string, controller) {
                    await edit(chunk)
                },
            })
            c.session.ctx.waitUntil(result.textStream.pipeThrough(new TextBufferTransformStream(64)).pipeTo(streamEdit))
        }
    }
)
