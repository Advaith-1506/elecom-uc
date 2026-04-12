import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(
  process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
)

export const GEMINI_PRIMARY_MODEL = "gemini-2.5-flash"
export const GEMINI_FALLBACK_MODEL = "gemini-2.5-flash-lite"
export const GEMINI_MODELS = [
  GEMINI_PRIMARY_MODEL,
  GEMINI_FALLBACK_MODEL,
] as const

type GeminiModelName = (typeof GEMINI_MODELS)[number]

export const geminiFlash = genAI.getGenerativeModel({
  model: GEMINI_PRIMARY_MODEL
})

function getModel(model: GeminiModelName) {
  return genAI.getGenerativeModel({ model })
}

function shouldRetryWithFallback(error: unknown) {
  const message = getGeminiErrorMessage(error).toLowerCase()
  return (
    message.includes("[503") ||
    message.includes("high demand") ||
    message.includes("overloaded") ||
    message.includes("unavailable")
  )
}

export async function generateGeminiText(
  prompt: string
): Promise<{ text: string; model: GeminiModelName }> {
  try {
    const result = await getModel(GEMINI_PRIMARY_MODEL).generateContent(prompt)
    return {
      text: result.response.text(),
      model: GEMINI_PRIMARY_MODEL,
    }
  } catch (error) {
    if (!shouldRetryWithFallback(error)) {
      throw error
    }

    const fallbackResult = await getModel(GEMINI_FALLBACK_MODEL).generateContent(prompt)
    return {
      text: fallbackResult.response.text(),
      model: GEMINI_FALLBACK_MODEL,
    }
  }
}

export async function imageUrlToBase64(
  url: string
): Promise<string> {
  const response = await fetch(url)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = (reader.result as string)
        .split(",")[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function analyzeSpectrogramImage(
  imageUrl: string,
  prompt: string
): Promise<{ text: string; model: GeminiModelName }> {
  const base64 = await imageUrlToBase64(imageUrl)
  try {
    const result = await getModel(GEMINI_PRIMARY_MODEL).generateContent([
      {
        inlineData: {
          mimeType: "image/png",
          data: base64
        }
      },
      { text: prompt }
    ])

    return {
      text: result.response.text(),
      model: GEMINI_PRIMARY_MODEL,
    }
  } catch (error) {
    if (!shouldRetryWithFallback(error)) {
      throw error
    }

    const fallbackResult = await getModel(GEMINI_FALLBACK_MODEL).generateContent([
      {
        inlineData: {
          mimeType: "image/png",
          data: base64
        }
      },
      { text: prompt }
    ])

    return {
      text: fallbackResult.response.text(),
      model: GEMINI_FALLBACK_MODEL,
    }
  }
}

export function getGeminiErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === "string" && error) {
    return error
  }

  try {
    return JSON.stringify(error)
  } catch {
    return "Unknown Gemini error"
  }
}

export function getGeminiDisplayError(error: unknown): string {
  const base = "Analysis unavailable — check API key"
  if (process.env.NODE_ENV === "development") {
    return `${base}\n${getGeminiErrorMessage(error)}`
  }
  return base
}
