import { Composer } from "grammy"

export const setting = new Composer<MyContext>()

setting.command("models", async (c) => {
    await c.reply(
        `当前模型: \n${modelMap[(await c.session.env.YATCC.get<models>(`${c.msg.chat.id}-model`)) ?? "@cf/qwen/qwen1.5-14b-chat-awq"]}
        `,
        {
            reply_markup: {
                inline_keyboard: [
                    [makeInlineKeyboard(c.msg.chat.id, "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b")],
                    [
                        makeInlineKeyboard(c.msg.chat.id, "@cf/qwen/qwen1.5-14b-chat-awq"),
                        makeInlineKeyboard(c.msg.chat.id, "@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
                    ],
                ],
            },
            reply_parameters: { message_id: c.msg.message_id },
            entities: [{ type: "bold", offset: 0, length: 5 }],
        }
    )
})

setting.on("callback_query:data", async (c) => {
    const [chat_id, model] = c.callbackQuery.data.split("|", 2)
    await Promise.all([c.answerCallbackQuery(modelMap[model as models]), c.session.env.YATCC.put(`${chat_id}-model`, model)])
})

const modelMap = {
    "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b": "deepseek r1 distill qwen 32b",
    "@cf/qwen/qwen1.5-14b-chat-awq": "qwen1.5 14b",
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast": "llama 3.3 70b",
}

function makeInlineKeyboard(chat_id: number, model: models) {
    return {
        text: modelMap[model],
        callback_data: `${chat_id}|${model}`,
    }
}

declare global {
    type models = keyof typeof modelMap
}
