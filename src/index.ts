import { Bot, session, webhookCallback } from "grammy"
import { chat } from "./chat"
import { log } from "./log"
import { help } from "./help"
import { setting } from "./setting"

export default {
    async fetch(request, env, ctx): Promise<Response> {
        const bot = new Bot<MyContext>(env.BOT_TOKEN, { botInfo: env.BOT_INFO })

        bot.use(session({ initial: () => ({ env, ctx }) }))
        bot.use(log)
        bot.use(help)
        bot.use(setting)
        bot.use(chat)

        return webhookCallback(bot, "cloudflare-mod", { secretToken: env.secret_token })(request).catch((err) => {
            console.error(err)
            return new Response(null, { status: 200 })
        })
    },
} satisfies ExportedHandler<Env>
