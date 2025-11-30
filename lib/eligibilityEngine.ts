import { ExtractedFields } from './documentVerifier'
import { ValidationCheck } from './validator'
import { parseISO, differenceInYears, addMonths } from 'date-fns'

export interface EligibilityResult {
  eligible: boolean
  reason: string
  visaType?: string
}

interface EligibilityPolicy {
  visaType: string
  minAge: number
  maxAge?: number
  minPassportValidity: number // months
  allowedNationalities?: string[]
  deniedNationalities?: string[]
  requiresValidPassport: boolean
}

// Configurable eligibility policies
const eligibilityPolicies: Record<string, EligibilityPolicy> = {
  tourist: {
    visaType: 'tourist',
    minAge: 18,
    minPassportValidity: 6,
    requiresValidPassport: true
  },
  business: {
    visaType: 'business',
    minAge: 21,
    minPassportValidity: 6,
    requiresValidPassport: true
  },
  student: {
    visaType: 'student',
    minAge: 16,
    maxAge: 35,
    minPassportValidity: 12,
    requiresValidPassport: true
  },
  work: {
    visaType: 'work',
    minAge: 18,
    maxAge: 65,
    minPassportValidity: 12,
    requiresValidPassport: true
  },
  transit: {
    visaType: 'transit',
    minAge: 18,
    minPassportValidity: 3,
    requiresValidPassport: true
  }
}

export function assessEligibility(
  extractedFields: ExtractedFields,
  applicantData: any,
  validationChecks: ValidationCheck[]
): EligibilityResult {
  const visaType = applicantData.intendedVisaType || 'tourist'
  const policy = eligibilityPolicies[visaType.toLowerCase()] || eligibilityPolicies.tourist

  // Check if document is valid (critical validations passed)
  const criticalChecks = validationChecks.filter(check =>
    ['expiryDate', 'documentNumber', 'dateOfBirth', 'name'].includes(check.field)
  )

  const criticalFailures = criticalChecks.filter(check => !check.passed)

  if (policy.requiresValidPassport && criticalFailures.length > 0) {
    return {
      eligible: false,
      reason: `Critical validation failures: ${criticalFailures.map(c => c.message).join('; ')}`,
      visaType
    }
  }

  // Check age requirements
  if (extractedFields.dateOfBirth?.value) {
    try {
      const dob = parseISO(extractedFields.dateOfBirth.value)
      const age = differenceInYears(new Date(), dob)

      if (age < policy.minAge) {
        return {
          eligible: false,
          reason: `Applicant age (${age}) is below minimum age requirement (${policy.minAge}) for ${visaType} visa`,
          visaType
        }
      }

      if (policy.maxAge && age > policy.maxAge) {
        return {
          eligible: false,
          reason: `Applicant age (${age}) exceeds maximum age requirement (${policy.maxAge}) for ${visaType} visa`,
          visaType
        }
      }
    } catch (error) {
      return {
        eligible: false,
        reason: 'Unable to verify age - invalid date of birth',
        visaType
      }
    }
  }

  // Check passport validity period
  if (extractedFields.expiryDate?.value) {
    try {
      const expiryDate = parseISO(extractedFields.expiryDate.value)
      const requiredValidUntil = addMonths(new Date(), policy.minPassportValidity)

      if (expiryDate < requiredValidUntil) {
        return {
          eligible: false,
          reason: `Passport must be valid for at least ${policy.minPassportValidity} months from today. Current expiry: ${extractedFields.expiryDate.value}`,
          visaType
        }
      }
    } catch (error) {
      return {
        eligible: false,
        reason: 'Unable to verify passport validity period',
        visaType
      }
    }
  }

  // Check nationality restrictions
  if (policy.allowedNationalities && extractedFields.nationality?.value) {
    const nationality = extractedFields.nationality.value.toUpperCase()
    if (!policy.allowedNationalities.includes(nationality)) {
      return {
        eligible: false,
        reason: `Nationality ${nationality} is not eligible for ${visaType} visa`,
        visaType
      }
    }
  }

  if (policy.deniedNationalities && extractedFields.nationality?.value) {
    const nationality = extractedFields.nationality.value.toUpperCase()
    if (policy.deniedNationalities.includes(nationality)) {
      return {
        eligible: false,
        reason: `Nationality ${nationality} is not eligible for ${visaType} visa due to policy restrictions`,
        visaType
      }
    }
  }

  // Check confidence scores
  const lowConfidenceCount = Object.values(extractedFields)
    .filter(field => field && field.confidence < 60)
    .length

  if (lowConfidenceCount > 3) {
    return {
      eligible: false,
      reason: 'Document quality insufficient - too many low-confidence field extractions. Manual review required.',
      visaType
    }
  }

  // Check overall validation pass rate
  const passRate = validationChecks.filter(c => c.passed).length / validationChecks.length

  if (passRate < 0.7) {
    return {
      eligible: false,
      reason: `Insufficient validation pass rate (${Math.round(passRate * 100)}%). Multiple checks failed.`,
      visaType
    }
  }

  // All checks passed
  return {
    eligible: true,
    reason: `Applicant meets all eligibility requirements for ${visaType} visa. Document is valid and all required fields verified.`,
    visaType
  }
}
