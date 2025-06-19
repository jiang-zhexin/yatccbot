import { Bot, webhookCallback } from "grammy"
import { env } from "cloudflare:workers"

import { chat } from "./chat"
import { log } from "./log"
import { help } from "./help"
import { menuSetting, setting } from "./setting"

const bot = new Bot<MyContext>(env.BOT_TOKEN, { botInfo: env.BOT_INFO })

bot.use(log)
bot.use(help)

bot.use(menuSetting)
bot.use(setting)

bot.use(chat)

export default {
    async fetch(request, env, ctx): Promise<Response> {
        globalThis.executionContext = ctx

        return webhookCallback(bot, "cloudflare-mod", { secretToken: env.secret_token })(request).catch((err) => {
            console.error(err)
            return new Response(null, { status: 200 })
        })
    },
} satisfies ExportedHandler<Env>
