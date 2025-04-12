import { Composer } from "grammy"
import { Menu, MenuRange } from "@grammyjs/menu"

import { defaultModel, modelMap } from "./constant"

export const setting = new Composer<MyContext>()

export const menuSetting = new Menu<MyContext>("model setting").dynamic((c) => {
    const { env, ctx } = c.config
    const range = new MenuRange<MyContext>()

    let addRow = false
    for (const model of Object.values(modelMap)) {
        if (model.provider === "google-ai-studio" && !env.GOOGLE_GENERATIVE_AI_API_KEY) continue

        range.text(model.name, async (c) => {
            c.menu.close()
            ctx.waitUntil(env.YATCC.put(`${c.chatId}-model`, model.id))
            await c.editMessageText(`当前模型: ${model.name}`, { entities: [{ type: "bold", offset: 0, length: 5 }] })
        })

        if (addRow) range.row()
        addRow = !addRow
    }
    return range
})

setting.command("models", async (c) => {
    const { env } = c.config

    const model = (await env.YATCC.get<models>(`${c.msg.chat.id}-model`)) ?? defaultModel

    await c.reply(`当前模型: ${modelMap[model].name}`, {
        reply_markup: menuSetting,
        entities: [{ type: "bold", offset: 0, length: 5 }],
        reply_parameters: { message_id: c.msg.message_id },
    })
})
