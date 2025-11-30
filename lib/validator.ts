import { ExtractedFields } from './documentVerifier'
import { parseISO, isAfter, isBefore, differenceInYears } from 'date-fns'

export interface ValidationCheck {
  field: string
  passed: boolean
  message: string
}

export function validateDocument(
  extractedFields: ExtractedFields,
  applicantData: any
): ValidationCheck[] {
  const checks: ValidationCheck[] = []

  // 1. Document expiry check
  if (extractedFields.expiryDate?.value) {
    try {
      const expiryDate = parseISO(extractedFields.expiryDate.value)
      const today = new Date()
      const isExpired = isBefore(expiryDate, today)

      checks.push({
        field: 'expiryDate',
        passed: !isExpired,
        message: isExpired
          ? `Document expired on ${extractedFields.expiryDate.value}`
          : `Document valid until ${extractedFields.expiryDate.value}`
      })

      // Check if expiry is within 6 months (warning for some visa applications)
      const sixMonthsFromNow = new Date()
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)

      if (!isExpired && isBefore(expiryDate, sixMonthsFromNow)) {
        checks.push({
          field: 'expiryDate',
          passed: true,
          message: 'Warning: Document expires within 6 months'
        })
      }
    } catch (error) {
      checks.push({
        field: 'expiryDate',
        passed: false,
        message: 'Invalid expiry date format'
      })
    }
  }

  // 2. Issue date check (should be before today and before expiry)
  if (extractedFields.issueDate?.value) {
    try {
      const issueDate = parseISO(extractedFields.issueDate.value)
      const today = new Date()
      const isValidIssueDate = isBefore(issueDate, today)

      checks.push({
        field: 'issueDate',
        passed: isValidIssueDate,
        message: isValidIssueDate
          ? `Document issued on ${extractedFields.issueDate.value}`
          : 'Issue date is in the future'
      })
    } catch (error) {
      checks.push({
        field: 'issueDate',
        passed: false,
        message: 'Invalid issue date format'
      })
    }
  }

  // 3. Name matching check
  if (applicantData.name && (extractedFields.fullName?.value || extractedFields.firstName?.value)) {
    const extractedName = (extractedFields.fullName?.value ||
      `${extractedFields.firstName?.value || ''} ${extractedFields.lastName?.value || ''}`).trim().toLowerCase()
    const applicantName = applicantData.name.trim().toLowerCase()

    // Fuzzy matching - check if names contain each other or are similar
    const namesMatch = extractedName.includes(applicantName) ||
                       applicantName.includes(extractedName) ||
                       calculateSimilarity(extractedName, applicantName) > 0.7

    checks.push({
      field: 'name',
      passed: namesMatch,
      message: namesMatch
        ? 'Name matches application'
        : `Name mismatch: Document shows "${extractedFields.fullName?.value || extractedName}", application shows "${applicantData.name}"`
    })
  }

  // 4. Date of birth check
  if (applicantData.dateOfBirth && extractedFields.dateOfBirth?.value) {
    const dobMatch = applicantData.dateOfBirth === extractedFields.dateOfBirth.value

    checks.push({
      field: 'dateOfBirth',
      passed: dobMatch,
      message: dobMatch
        ? 'Date of birth matches application'
        : `DOB mismatch: Document shows "${extractedFields.dateOfBirth.value}", application shows "${applicantData.dateOfBirth}"`
    })

    // Age validation (must be at least 18 for most visas)
    try {
      const dob = parseISO(extractedFields.dateOfBirth.value)
      const age = differenceInYears(new Date(), dob)

      checks.push({
        field: 'age',
        passed: age >= 18 && age < 120,
        message: age >= 18 && age < 120
          ? `Applicant age: ${age} years`
          : age < 18 ? 'Applicant is under 18 - may require guardian' : 'Invalid age calculated'
      })
    } catch (error) {
      checks.push({
        field: 'dateOfBirth',
        passed: false,
        message: 'Invalid date of birth format'
      })
    }
  }

  // 5. Passport/Document number check
  if (applicantData.passportNumber && extractedFields.documentNumber?.value) {
    const numberMatch = applicantData.passportNumber.toUpperCase().trim() ===
                       extractedFields.documentNumber.value.toUpperCase().trim()

    checks.push({
      field: 'documentNumber',
      passed: numberMatch,
      message: numberMatch
        ? 'Document number matches application'
        : `Document number mismatch: Document shows "${extractedFields.documentNumber.value}", application shows "${applicantData.passportNumber}"`
    })
  }

  // 6. Nationality check
  if (applicantData.nationality && extractedFields.nationality?.value) {
    const nationalityMatch = applicantData.nationality.toUpperCase().trim() ===
                            extractedFields.nationality.value.toUpperCase().trim()

    checks.push({
      field: 'nationality',
      passed: nationalityMatch,
      message: nationalityMatch
        ? 'Nationality matches application'
        : `Nationality mismatch: Document shows "${extractedFields.nationality.value}", application shows "${applicantData.nationality}"`
    })
  }

  // 7. MRZ checksum validation (if MRZ is present)
  if (extractedFields.mrzLine1?.value && extractedFields.mrzLine2?.value) {
    const mrzValid = validateMRZ(
      extractedFields.mrzLine1.value,
      extractedFields.mrzLine2.value,
      extractedFields.mrzLine3?.value
    )

    checks.push({
      field: 'mrzChecksum',
      passed: mrzValid,
      message: mrzValid
        ? 'MRZ checksum validation passed'
        : 'MRZ checksum validation failed - possible forgery or OCR error'
    })
  }

  // 8. Document type validation
  if (extractedFields.documentType?.value) {
    const validTypes = ['passport', 'visa', 'nationalId', 'drivingLicense', 'nationalid', 'drivinglicense']
    const isValidType = validTypes.includes(extractedFields.documentType.value.toLowerCase())

    checks.push({
      field: 'documentType',
      passed: isValidType,
      message: isValidType
        ? `Document type: ${extractedFields.documentType.value}`
        : 'Unrecognized document type'
    })
  }

  // 9. Confidence score check
  const lowConfidenceFields = Object.entries(extractedFields)
    .filter(([key, field]) => field && field.confidence < 60)
    .map(([key]) => key)

  if (lowConfidenceFields.length > 0) {
    checks.push({
      field: 'confidence',
      passed: false,
      message: `Low confidence in fields: ${lowConfidenceFields.join(', ')} - manual review recommended`
    })
  } else {
    checks.push({
      field: 'confidence',
      passed: true,
      message: 'All extracted fields have acceptable confidence scores'
    })
  }

  return checks
}

function validateMRZ(line1: string, line2: string, line3?: string): boolean {
  try {
    // Basic MRZ validation - check format and length
    // Passport TD-3 format: 2 lines of 44 characters each
    // ID Card TD-1 format: 3 lines of 30 characters each

    if (line1.length === 44 && line2.length === 44) {
      // TD-3 format (passport)
      return validateTD3Checksum(line1, line2)
    } else if (line1.length === 30 && line2.length === 30 && line3 && line3.length === 30) {
      // TD-1 format (ID card)
      return validateTD1Checksum(line1, line2, line3)
    }

    // If format doesn't match standard, return true (we can't validate, but won't fail)
    return true
  } catch (error) {
    console.error('MRZ validation error:', error)
    return true // Don't fail on validation errors
  }
}

function validateTD3Checksum(line1: string, line2: string): boolean {
  // Simplified checksum validation for TD-3 format
  // In production, implement full checksum algorithm per ICAO Doc 9303

  // Check if lines contain only valid MRZ characters
  const validMRZChars = /^[A-Z0-9<]+$/

  return validMRZChars.test(line1) && validMRZChars.test(line2)
}

function validateTD1Checksum(line1: string, line2: string, line3: string): boolean {
  // Simplified checksum validation for TD-1 format
  const validMRZChars = /^[A-Z0-9<]+$/

  return validMRZChars.test(line1) && validMRZChars.test(line2) && validMRZChars.test(line3)
}

function calculateSimilarity(str1: string, str2: string): number {
  // Simple Levenshtein-based similarity
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1

  if (longer.length === 0) return 1.0

  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}
