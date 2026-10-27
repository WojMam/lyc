/**
 * Future local AI integration contracts (v1: interfaces only — no Ollama calls).
 */

import type { Transcript } from '../domain/types'

export interface SummaryRequest {
  transcript: Transcript
  style: 'short' | 'detailed' | 'topics' | 'insights' | 'timestamped_notes'
  language?: 'pl' | 'en'
  model?: string
}

export interface SummaryResult {
  text: string
  style: SummaryRequest['style']
  model: string
  createdAt: string
  segmentsUsed: number
}

export interface ChatRequest {
  transcript: Transcript
  question: string
  model?: string
}

export interface ChatResult {
  answer: string
  model: string
  citations?: Array<{ startMs: number; endMs: number; text: string }>
}

export interface AIProvider {
  readonly id: string
  readonly displayName: string
  isAvailable(): Promise<boolean>
  listModels(): Promise<string[]>
  summarize(request: SummaryRequest, signal?: AbortSignal): Promise<SummaryResult>
  chat?(request: ChatRequest, signal?: AbortSignal): Promise<ChatResult>
}

export interface SummarizationService {
  summarize(request: SummaryRequest, signal?: AbortSignal): Promise<SummaryResult>
}

export interface TranscriptRepository {
  save(transcript: Transcript): Promise<void>
  getByVideoId(videoId: string): Promise<Transcript | null>
  listRecent(limit: number): Promise<Transcript[]>
}
