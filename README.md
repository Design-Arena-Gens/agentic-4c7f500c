# Document Verifier AI

AI-powered passport and government document verification system using GPT-4 Vision, OCR, and automated validation.

## Features

- **Multi-Document Support**: Passports, visas, national IDs, driving licenses
- **AI Vision Analysis**: GPT-4 Vision for intelligent document text extraction
- **OCR Integration**: Tesseract.js for Machine Readable Zone (MRZ) extraction
- **Field Validation**: Comprehensive validation of extracted data
  - Expiry date checks
  - Name matching
  - Date of birth verification
  - MRZ checksum validation
  - Document number cross-checking
- **Eligibility Assessment**: Configurable visa eligibility policies
- **Confidence Scoring**: 0-100 confidence scores for each extracted field
- **JSON API Response**: Structured JSON output with all verification data

## Deployment

Deployed at: https://agentic-4c7f500c.vercel.app

## Setup

1. Clone and install:
```bash
npm install
```

2. Create `.env.local`:
```
OPENAI_API_KEY=your_openai_api_key
```

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
npm start
```

## API Usage

### POST /api/verify

Upload a document image with applicant data:

**Request (multipart/form-data):**
- `image`: Document image file
- `applicantData`: JSON string with applicant information

**Response (JSON):**
```json
{
  "overallConfidence": 85,
  "extractedFields": {
    "documentType": {"value": "passport", "confidence": 95},
    "documentNumber": {"value": "A12345678", "confidence": 90},
    "firstName": {"value": "John", "confidence": 92},
    "lastName": {"value": "Doe", "confidence": 92},
    "dateOfBirth": {"value": "1990-01-15", "confidence": 88},
    "nationality": {"value": "USA", "confidence": 95},
    "expiryDate": {"value": "2030-12-31", "confidence": 90}
  },
  "validationChecks": [
    {
      "field": "expiryDate",
      "passed": true,
      "message": "Document valid until 2030-12-31"
    }
  ],
  "eligibilityAssessment": {
    "eligible": true,
    "reason": "Applicant meets all eligibility requirements",
    "visaType": "tourist"
  },
  "recommendedActions": [
    "Document appears valid and applicant is eligible",
    "Proceed with visa application processing"
  ],
  "summary": "Document verification successful. passport #A12345678 for John Doe is valid..."
}
```

## Technology Stack

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **OpenAI GPT-4 Vision**: Document image analysis
- **Tesseract.js**: OCR for MRZ extraction
- **Tailwind CSS**: UI styling
- **date-fns**: Date validation and manipulation

## Validation Features

1. **Document Expiry**: Checks if document is expired or expires soon
2. **Issue Date**: Validates issue date is logical
3. **Name Matching**: Fuzzy matching between document and application
4. **Date of Birth**: Cross-checks DOB and calculates age
5. **Document Number**: Exact match verification
6. **Nationality**: Country code validation
7. **MRZ Checksum**: ICAO Doc 9303 compliant validation
8. **Confidence Scoring**: Quality assessment of extracted data

## Eligibility Policies

Configurable visa type policies with:
- Minimum/maximum age requirements
- Passport validity period requirements
- Nationality allowlists/denylists
- Document quality thresholds

Supported visa types: tourist, business, student, work, transit

## License

MIT
