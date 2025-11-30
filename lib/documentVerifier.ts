import OpenAI from 'openai'
import { extractTextFromImage } from './ocrEngine'
import { validateDocument, ValidationCheck } from './validator'
import { assessEligibility, EligibilityResult } from './eligibilityEngine'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
})

export interface ExtractedField {
  value: string
  confidence: number
}

export interface ExtractedFields {
  documentType?: ExtractedField
  documentNumber?: ExtractedField
  firstName?: ExtractedField
  lastName?: ExtractedField
  fullName?: ExtractedField
  dateOfBirth?: ExtractedField
  nationality?: ExtractedField
  issuingCountry?: ExtractedField
  issueDate?: ExtractedField
  expiryDate?: ExtractedField
  sex?: ExtractedField
  placeOfBirth?: ExtractedField
  mrzLine1?: ExtractedField
  mrzLine2?: ExtractedField
  mrzLine3?: ExtractedField
  [key: string]: ExtractedField | undefined
}

export interface VerificationResult {
  overallConfidence: number
  extractedFields: ExtractedFields
  validationChecks: ValidationCheck[]
  eligibilityAssessment: EligibilityResult
  recommendedActions: string[]
  summary: string
}

export async function verifyDocument(
  base64Image: string,
  applicantData: any
): Promise<VerificationResult> {
  try {
    // Step 1: Extract text using OCR
    const ocrText = await extractTextFromImage(base64Image)

    // Step 2: Use GPT-4 Vision to analyze the document
    const visionAnalysis = await analyzeDocumentWithVision(base64Image, ocrText)

    // Step 3: Extract structured data
    const extractedFields = parseVisionAnalysis(visionAnalysis)

    // Step 4: Validate extracted data
    const validationChecks = validateDocument(extractedFields, applicantData)

    // Step 5: Assess eligibility
    const eligibilityAssessment = assessEligibility(extractedFields, applicantData, validationChecks)

    // Step 6: Calculate overall confidence
    const overallConfidence = calculateOverallConfidence(extractedFields, validationChecks)

    // Step 7: Generate recommendations
    const recommendedActions = generateRecommendations(validationChecks, eligibilityAssessment)

    // Step 8: Generate summary
    const summary = generateSummary(extractedFields, validationChecks, eligibilityAssessment)

    return {
      overallConfidence,
      extractedFields,
      validationChecks,
      eligibilityAssessment,
      recommendedActions,
      summary
    }
  } catch (error: any) {
    throw new Error(`Document verification failed: ${error.message}`)
  }
}

async function analyzeDocumentWithVision(base64Image: string, ocrText: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are an expert document analyzer specializing in passports, visas, national IDs, and driving licenses. Analyze this government-issued document image and extract ALL visible information.

OCR Text (for reference):
${ocrText}

Please extract the following information in JSON format:
{
  "documentType": "passport|visa|nationalId|drivingLicense|other",
  "documentNumber": "string",
  "firstName": "string",
  "lastName": "string",
  "fullName": "string",
  "dateOfBirth": "YYYY-MM-DD",
  "nationality": "string (3-letter code if available)",
  "issuingCountry": "string (3-letter code if available)",
  "issueDate": "YYYY-MM-DD",
  "expiryDate": "YYYY-MM-DD",
  "sex": "M|F|X",
  "placeOfBirth": "string",
  "mrzLine1": "string (Machine Readable Zone line 1)",
  "mrzLine2": "string (Machine Readable Zone line 2)",
  "mrzLine3": "string (Machine Readable Zone line 3, if exists)",
  "additionalInfo": "any other relevant information"
}

For each field, provide a confidence score 0-100. If a field is not visible or unclear, set confidence to 0.
Return ONLY valid JSON, no additional text.`
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }
        ]
      }
    ],
    max_tokens: 1500
  })

  return response.choices[0]?.message?.content || '{}'
}

function parseVisionAnalysis(visionResponse: string): ExtractedFields {
  try {
    // Extract JSON from response
    const jsonMatch = visionResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in vision response')
    }

    const parsed = JSON.parse(jsonMatch[0])
    const fields: ExtractedFields = {}

    // Convert flat structure to ExtractedField objects
    for (const [key, value] of Object.entries(parsed)) {
      if (value && typeof value === 'object' && 'value' in value && 'confidence' in value) {
        fields[key] = value as ExtractedField
      } else if (value !== null && value !== undefined && value !== '') {
        // Assign default confidence based on field type
        const confidence = estimateConfidence(key, value as string)
        fields[key] = {
          value: String(value),
          confidence
        }
      }
    }

    return fields
  } catch (error) {
    console.error('Failed to parse vision analysis:', error)
    return {}
  }
}

function estimateConfidence(fieldName: string, value: string): number {
  // Heuristic confidence estimation
  if (!value || value.trim() === '') return 0

  const criticalFields = ['documentNumber', 'dateOfBirth', 'expiryDate', 'nationality']
  const baseConfidence = criticalFields.includes(fieldName) ? 85 : 80

  // Check for date format
  if (fieldName.includes('Date') || fieldName.includes('date')) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    return dateRegex.test(value) ? baseConfidence : baseConfidence - 20
  }

  // Check for MRZ format
  if (fieldName.includes('mrz')) {
    return value.length > 20 ? baseConfidence : baseConfidence - 30
  }

  return baseConfidence
}

function calculateOverallConfidence(fields: ExtractedFields, checks: ValidationCheck[]): number {
  const fieldConfidences = Object.values(fields)
    .map(f => f?.confidence || 0)
    .filter(c => c > 0)

  const avgFieldConfidence = fieldConfidences.length > 0
    ? fieldConfidences.reduce((a, b) => a + b, 0) / fieldConfidences.length
    : 50

  const passedChecks = checks.filter(c => c.passed).length
  const validationScore = checks.length > 0 ? (passedChecks / checks.length) * 100 : 70

  // Weighted average: 60% field confidence, 40% validation score
  const overall = Math.round(avgFieldConfidence * 0.6 + validationScore * 0.4)

  return Math.min(100, Math.max(0, overall))
}

function generateRecommendations(checks: ValidationCheck[], eligibility: EligibilityResult): string[] {
  const recommendations: string[] = []

  const failedChecks = checks.filter(c => !c.passed)

  if (failedChecks.length === 0 && eligibility.eligible) {
    recommendations.push('Document appears valid and applicant is eligible')
    recommendations.push('Proceed with visa application processing')
  } else {
    if (failedChecks.some(c => c.field.includes('expiry') || c.field.includes('Expiry'))) {
      recommendations.push('Document has expired - request renewed document')
    }

    if (failedChecks.some(c => c.field.includes('MRZ') || c.field.includes('checksum'))) {
      recommendations.push('MRZ validation failed - verify document authenticity')
    }

    if (failedChecks.some(c => c.field.includes('name') || c.field.includes('Name'))) {
      recommendations.push('Name mismatch detected - request clarification from applicant')
    }

    if (!eligibility.eligible) {
      recommendations.push('Applicant not eligible for requested visa type')
      recommendations.push('Contact applicant for additional documentation or alternate visa type')
    }

    if (failedChecks.length > 3) {
      recommendations.push('Multiple validation failures - manual review required')
    }
  }

  return recommendations
}

function generateSummary(
  fields: ExtractedFields,
  checks: ValidationCheck[],
  eligibility: EligibilityResult
): string {
  const docType = fields.documentType?.value || 'document'
  const docNumber = fields.documentNumber?.value || 'unknown'
  const name = fields.fullName?.value || fields.firstName?.value || 'unknown'

  const passedChecks = checks.filter(c => c.passed).length
  const totalChecks = checks.length

  if (passedChecks === totalChecks && eligibility.eligible) {
    return `Document verification successful. ${docType} #${docNumber} for ${name} is valid and applicant is eligible for ${eligibility.visaType || 'requested'} visa. All validation checks passed (${passedChecks}/${totalChecks}).`
  } else if (passedChecks >= totalChecks * 0.7) {
    return `Document partially validated. ${docType} #${docNumber} for ${name} passed ${passedChecks} of ${totalChecks} checks. ${eligibility.eligible ? 'Applicant is eligible' : 'Applicant eligibility unclear'}. Manual review recommended.`
  } else {
    return `Document validation concerns. ${docType} #${docNumber} for ${name} failed multiple validation checks (${totalChecks - passedChecks} failures). ${eligibility.eligible ? '' : 'Applicant not eligible. '}Additional verification required.`
  }
}
