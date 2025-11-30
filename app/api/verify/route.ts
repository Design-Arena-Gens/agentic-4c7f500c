import { NextRequest, NextResponse } from 'next/server'
import { verifyDocument } from '@/lib/documentVerifier'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File
    const applicantDataStr = formData.get('applicantData') as string

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    if (!applicantDataStr) {
      return NextResponse.json({ error: 'No applicant data provided' }, { status: 400 })
    }

    const applicantData = JSON.parse(applicantDataStr)

    // Convert image to base64
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')

    // Verify document
    const result = await verifyDocument(base64Image, applicantData)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Verification error:', error)
    return NextResponse.json(
      { error: error.message || 'Verification failed' },
      { status: 500 }
    )
  }
}
