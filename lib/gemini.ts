import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(
  process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
)

export const geminiFlash = genAI.getGenerativeModel({
  model: "gemini-2.5-flash"
})

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
): Promise<string> {
  const base64 = await imageUrlToBase64(imageUrl)
  const model = geminiFlash
  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "image/png",
        data: base64
      }
    },
    { text: prompt }
  ])
  return result.response.text()
}
