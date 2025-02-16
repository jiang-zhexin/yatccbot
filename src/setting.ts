import { Composer } from "grammy"
import type { InlineKeyboardButton } from "grammy/types"

export const setting = new Composer<MyContext>()

setting.command("models", async (c) => {
    const [model, message] = await Promise.all([
        c.session.env.YATCC.get<models>(`${c.msg.chat.id}-model`),
        c.reply("当前模型: ", {
            reply_parameters: { message_id: c.msg.message_id },
            entities: [{ type: "bold", offset: 0, length: 5 }],
        }),
    ])
    await c.api.editMessageText(message.chat.id, message.message_id, `当前模型: \n${modelMap[model ?? "@cf/qwen/qwen1.5-14b-chat-awq"]}`, {
        reply_markup: {
            inline_keyboard: [
                [makeInlineKeyboard(c.msg.chat.id, message.message_id, "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b")],
                [
                    makeInlineKeyboard(c.msg.chat.id, message.message_id, "@cf/qwen/qwen1.5-14b-chat-awq"),
                    makeInlineKeyboard(c.msg.chat.id, message.message_id, "@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
                ],
            ],
        },
        entities: [{ type: "bold", offset: 0, length: 5 }],
    })
})

setting.on("callback_query:data", async (c) => {
    const [chat_id, message_id, model] = c.callbackQuery.data.split("|", 3)
    await Promise.all([
        c.session.env.YATCC.put(`${chat_id}-model`, model),
        c.answerCallbackQuery(),
        c.api.editMessageText(chat_id, parseInt(message_id), `当前模型: \n${modelMap[model as models]}`, {
            entities: [{ type: "bold", offset: 0, length: 5 }],
        }),
    ])
})

const modelMap = {
    "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b": "deepseek r1 distill qwen 32b",
    "@cf/qwen/qwen1.5-14b-chat-awq": "qwen 1.5 14b",
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast": "llama 3.3 70b",
}

function makeInlineKeyboard(chat_id: number, message_id: number, model: models): InlineKeyboardButton {
    return {
        text: modelMap[model],
        callback_data: `${chat_id}|${message_id}|${model}`,
    }
}

declare global {
    type models = keyof typeof modelMap
}
