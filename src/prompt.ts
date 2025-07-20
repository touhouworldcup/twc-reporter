import { Content, GenerateContentResponse } from '@google/genai'
import { ai, systemPrompt } from './globals'
import { RateLimiter } from 'limiter'

const limiter = new RateLimiter({ tokensPerInterval: 5, interval: 'minute' })

export async function prompt (...messages: Array<[string, string]>): Promise<string> {
  let delay = 15000
  while (true) {
    try {
      return await prompt0(...messages)
    } catch (error) {
      delay = Math.round(delay * (1.5 + Math.random()))
      console.error(`API error, retrying in ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

async function prompt0 (...messages: Array<[string, string]>): Promise<string> {
  await limiter.removeTokens(1)
  const model = 'gemini-2.5-pro'
  const config = {
    responseMimeType: 'text/plain',
    systemInstruction: [{
      text: systemPrompt
    }]
  }
  const contents: Content[] = messages.map(message => {
    return {
      role: message[0],
      parts: [{ text: message[1] }]
    }
  })

  const response = await ai.models.generateContentStream({
    model,
    config,
    contents
  })

  const chunks: GenerateContentResponse[] = []
  for await (const chunk of response) {
    chunks.push(chunk)
  }
  return chunks.map(chunk => chunk.text).join('')
}
