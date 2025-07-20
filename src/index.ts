import { initGlobals, config, client, Region, digestPrompt } from './globals'
import { ChannelReport, createChannelReport } from './report'
import { prompt } from './prompt'
import { TextChannel } from 'discord.js'

void main()
async function main (): Promise<void> {
  await initGlobals()
  const tasks = config.regions.map(async (region) => await processRegion(region))
  await Promise.all(tasks)
  await client.destroy()
}

async function processRegion (sourceRegion: Region): Promise<void> {
  const report = await createChannelReport(sourceRegion)
  if (report === undefined) return
  const summary = await createChannelSummary(report)
  const tasks = config.regions.map(async (region) => await getTargetRegionMessages(summary, region))
  await Promise.all(tasks)
}

async function getTargetRegionMessages (summary: ChannelSummary, targetRegion: Region): Promise<void> {
  if (summary.region === targetRegion) return
  const digest = await createChannelDigest(summary, targetRegion)
  await sendChannelDigest(digest)
}

interface ChannelSummary extends ChannelReport {
  summaryText: string
}

interface ChannelDigest {
  sourceRegion: Region
  targetRegion: Region
  digestText: string
}

async function createChannelSummary (report: ChannelReport): Promise<ChannelSummary> {
  console.log('Creating channel summary', report.region.language)
  const summaryText = await prompt(['user', report.reportText])
  return { ...report, summaryText }
}

async function createChannelDigest (summary: ChannelSummary, targetRegion: Region): Promise<ChannelDigest> {
  console.log('Creating channel digest from', summary.region.language, 'for', targetRegion.language)
  const digestPromptText = digestPrompt
    .replaceAll('{{TARGET_LANGUAGE}}', targetRegion.language)
    .replaceAll('{{SOURCE_LANGUAGE}}', summary.region.language)

  const digestText = await prompt(
    ['user', summary.reportText],
    ['model', summary.summaryText],
    ['user', digestPromptText]
  )

  return { sourceRegion: summary.region, targetRegion, digestText }
}

async function sendChannelDigest (digest: ChannelDigest): Promise<void> {
  console.log('Sending channel digest of', digest.sourceRegion.language, 'to', digest.targetRegion.language)
  const text = digest.digestText
  if (!config.sendMessages) {
    console.log(`${digest.targetRegion.language} > ${text}`)
    return
  }

  const channel = await client.channels.fetch(digest.targetRegion.digestChannelId) as TextChannel
  await channel.send(text.slice(0, 2000))
  if (text.length < 2000) return

  await channel.send({
    files: [{
      attachment: Buffer.from(text.slice(2000), 'utf-8'),
      contentType: 'text/plain'
    }]
  })
}
