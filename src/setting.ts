import { Composer } from "grammy"
import type { InlineKeyboardButton } from "grammy/types"
import { modelMap } from "./constant"

export const setting = new Composer<MyContext>()

setting.command("models", async (c) => {
    const [model, message] = await Promise.all([
        c.session.env.YATCC.get<models>(`${c.msg.chat.id}-model`),
        c.reply("当前模型: ", {
            reply_parameters: { message_id: c.msg.message_id },
            entities: [{ type: "bold", offset: 0, length: 5 }],
        }),
    ])
    await c.api.editMessageText(
        message.chat.id,
        message.message_id,
        `当前模型: \n${modelMap[model ?? "@cf/qwen/qwen1.5-14b-chat-awq"]?.name}`,
        {
            reply_markup: {
                inline_keyboard: [
                    [makeInlineKeyboard(c.msg.chat.id, message.message_id, "@cf/qwen/qwen1.5-14b-chat-awq")],
                    [makeInlineKeyboard(c.msg.chat.id, message.message_id, "@cf/meta/llama-3.3-70b-instruct-fp8-fast")],
                    [makeInlineKeyboard(c.msg.chat.id, message.message_id, "@cf/google/gemma-7b-it-lora")],
                    [makeInlineKeyboard(c.msg.chat.id, message.message_id, "gemini-2.0-flash-001")],
                ],
            },
            entities: [{ type: "bold", offset: 0, length: 5 }],
        }
    )
})

setting.on("callback_query:data", async (c) => {
    const [chat_id, message_id, model] = c.callbackQuery.data.split("|", 3)
    await Promise.all([
        c.session.env.YATCC.put(`${chat_id}-model`, model),
        c.answerCallbackQuery(),
        c.api.editMessageText(chat_id, parseInt(message_id), `当前模型: \n${modelMap[model as models]?.name}`, {
            entities: [{ type: "bold", offset: 0, length: 5 }],
        }),
    ])
})

function makeInlineKeyboard(chat_id: number, message_id: number, model: models): InlineKeyboardButton {
    return {
        text: modelMap[model]?.name,
        callback_data: `${chat_id}|${message_id}|${model}`,
    }
}
