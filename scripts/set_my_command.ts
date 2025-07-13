import "dotenv/config"
import { Bot } from "grammy"

const bot = new Bot(process.env.BOT_TOKEN!)
await bot.init()
await bot.api.setMyCommands([
    { command: "chat", description: "开始对话" },
    { command: "help", description: "使用帮助" },
    { command: "models", description: "设置模型" },
])
