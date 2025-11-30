'use client'

import { useState } from 'react'

interface ApplicantForm {
  name: string
  dateOfBirth: string
  passportNumber: string
  nationality: string
  intendedVisaType: string
}

export default function Home() {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [applicantData, setApplicantData] = useState<ApplicantForm>({
    name: '',
    dateOfBirth: '',
    passportNumber: '',
    nationality: '',
    intendedVisaType: 'tourist'
  })
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setApplicantData({
      ...applicantData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imageFile) {
      setError('Please upload a document image')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('image', imageFile)
      formData.append('applicantData', JSON.stringify(applicantData))

      const response = await fetch('/api/verify', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred during verification')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-indigo-900">
          Document Verifier AI
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Upload passport, visa, national ID, or driving license for AI-powered verification
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Upload Document</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  required
                />
              </div>

              {imagePreview && (
                <div className="mt-4">
                  <img src={imagePreview} alt="Preview" className="max-h-48 rounded border" />
                </div>
              )}

              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Applicant Information</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={applicantData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={applicantData.dateOfBirth}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Passport Number
                    </label>
                    <input
                      type="text"
                      name="passportNumber"
                      value={applicantData.passportNumber}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="A12345678"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nationality
                    </label>
                    <input
                      type="text"
                      name="nationality"
                      value={applicantData.nationality}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="USA"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Intended Visa Type
                    </label>
                    <select
                      name="intendedVisaType"
                      value={applicantData.intendedVisaType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="tourist">Tourist</option>
                      <option value="business">Business</option>
                      <option value="student">Student</option>
                      <option value="work">Work</option>
                      <option value="transit">Transit</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition"
              >
                {loading ? 'Verifying...' : 'Verify Document'}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Verification Results</h2>

            {!result && !loading && (
              <div className="text-center text-gray-500 py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Upload a document to see verification results
              </div>
            )}

            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Analyzing document...</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {/* Summary */}
                <div className={`p-4 rounded-lg ${result.summary.includes('approved') || result.summary.includes('valid') ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                  <h3 className="font-semibold text-gray-800 mb-2">Summary</h3>
                  <p className="text-gray-700">{result.summary}</p>
                </div>

                {/* Overall Confidence */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-800">Overall Confidence</span>
                    <span className="text-2xl font-bold text-indigo-600">{result.overallConfidence}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${result.overallConfidence >= 80 ? 'bg-green-500' : result.overallConfidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${result.overallConfidence}%` }}
                    ></div>
                  </div>
                </div>

                {/* Extracted Fields */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">Extracted Fields</h3>
                  <div className="space-y-2">
                    {Object.entries(result.extractedFields || {}).map(([key, field]: [string, any]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                        <span className="font-medium text-gray-800">
                          {field.value} <span className="text-gray-500">({field.confidence}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Validation Checks */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">Validation Checks</h3>
                  <div className="space-y-2">
                    {result.validationChecks?.map((check: any, idx: number) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <span className={`mt-0.5 ${check.passed ? 'text-green-500' : 'text-red-500'}`}>
                          {check.passed ? '✓' : '✗'}
                        </span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{check.field}</div>
                          <div className="text-sm text-gray-600">{check.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Eligibility Assessment */}
                {result.eligibilityAssessment && (
                  <div className={`p-4 rounded-lg ${result.eligibilityAssessment.eligible ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <h3 className="font-semibold text-gray-800 mb-2">Eligibility Assessment</h3>
                    <p className="text-sm mb-2">
                      <strong>Status:</strong> {result.eligibilityAssessment.eligible ? 'Eligible' : 'Not Eligible'}
                    </p>
                    <p className="text-sm text-gray-700">{result.eligibilityAssessment.reason}</p>
                  </div>
                )}

                {/* Recommended Actions */}
                {result.recommendedActions && result.recommendedActions.length > 0 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">Recommended Actions</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      {result.recommendedActions.map((action: string, idx: number) => (
                        <li key={idx}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
