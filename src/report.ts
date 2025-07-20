import { client, config, Region } from './globals'
import { Attachment, Message, TextChannel } from 'discord.js'

export interface ChannelReport {
  region: Region
  reportText: string
}

export async function createChannelReport (region: Region): Promise<ChannelReport | undefined> {
  console.log('Creating channel report for', region.language)
  const dayDuration = 1000 * 3600 * 24
  const messages = await fetchMessagesSince(region, dayDuration * config.contextDays)
  const reportMessages = messages.filter(message => since(message) < dayDuration * config.reportDays)
  if (reportMessages.length === 0) return
  const contextMessages = messages.filter(message => since(message) >= dayDuration * config.reportDays)

  const contextLog = await createSection('Context Chat Log', contextMessages)
  const reportLog = await createSection('Report Chat Log', reportMessages)
  const report = `${contextLog}\n\n${reportLog}`
  return { region, reportText: report }
}

async function fetchMessagesSince (region: Region, duration: number): Promise<Message[]> {
  if (region.channelId === undefined) return []
  const channel = await client.channels.fetch(region.channelId) as TextChannel
  const result: Message[] = []
  let before: string | undefined
  while (true) {
    const messages = Array.from((await channel.messages.fetch({ limit: 100, before })).values())
    if (messages.length === 0) break
    result.push(...messages)
    const oldest = messages[messages.length - 1]
    before = oldest.id
    if (since(oldest) > duration) break
  }

  return result.sort((a, b) => a.createdTimestamp - b.createdTimestamp)
}

function since (message: Message): number {
  return message.client.readyTimestamp - message.createdTimestamp
}

async function messageToString (message: Message): Promise<string> {
  const time = new Date(message.createdTimestamp).toISOString()
  const name = message.member?.displayName ?? message.author.displayName
  const content = message.content
  const attachments = await Promise.all(message.attachments.map(attachmentToString))
  return [`${time} ${name}: ${content}`, ...attachments.filter(a => a !== undefined)].join('\n')
}

async function createSection (header: string, messages: Message[]): Promise<string> {
  const lines = await Promise.all(messages.map(messageToString))
  return [`--- ${header} ---`, lines].join('\n')
}

async function attachmentToString (attachment: Attachment): Promise<string | undefined> {
  const { url, contentType, name } = attachment
  if (contentType === null) return
  if (!contentType.includes('text/plain')) return
  const response = await fetch(url)
  const content = await response.text()
  return `Attachment ${name}: ${content}`
}
