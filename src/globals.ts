import { GoogleGenAI } from '@google/genai'
import { Client, GatewayIntentBits } from 'discord.js'
import { readFile } from 'fs/promises'

export let client: Client
export let ai: GoogleGenAI
export let config: Config
export let systemPrompt: string
export let digestPrompt: string

export async function initGlobals (): Promise<void> {
  config = await readFile('config/config.json', 'utf-8').then(JSON.parse)
  systemPrompt = await readFile('config/systemPrompt.txt', 'utf-8')
  digestPrompt = await readFile('config/digestPrompt.txt', 'utf-8')
  client = new Client<true>({
    intents: [GatewayIntentBits.GuildMessages]
  })
  ai = new GoogleGenAI({
    apiKey: config.geminiApiKey
  })
  await client.login(config.discordToken)
  await new Promise(resolve => client.once('ready', resolve))
}

export interface Region {
  language: string
  channelId: string
  digestChannelId: string
}

export interface Config {
  discordToken: string
  geminiApiKey: string
  sendMessages: boolean
  contextDays: number
  reportDays: number
  regions: Region[]
  systemPrompt: string
}
