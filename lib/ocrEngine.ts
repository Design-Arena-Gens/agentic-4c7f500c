export async function extractTextFromImage(base64Image: string): Promise<string> {
  try {
    // Use browser-based Tesseract.js for OCR
    // In production, this would be better with a server-side OCR solution
    // For now, we'll return a placeholder and rely on GPT-4 Vision

    // The OCR is primarily for backup and MRZ extraction
    // GPT-4 Vision is the primary analysis tool

    return 'OCR processing available via client-side Tesseract.js or server-side implementation'
  } catch (error) {
    console.error('OCR extraction failed:', error)
    return ''
  }
}
