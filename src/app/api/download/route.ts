import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { message: 'TikTok URL is required' },
        { status: 400 }
      )
    }

    const options = {
      method: 'GET',
      url: 'https://tiktok-video-downloader-api.p.rapidapi.com/media',
      params: { videoUrl: url },
      headers: {
        'x-rapidapi-key': 'b451e85621msha984aa4d8559d3cp190fdbjsn4782141d3759',
        'x-rapidapi-host': 'tiktok-video-downloader-api.p.rapidapi.com'
      }
    }

    const response = await axios.request(options)
    
    if (response.data.error) {
      return NextResponse.json(
        { message: response.data.error || 'Failed to download video' },
        { status: 400 }
      )
    }

    const downloadUrl = response.data.downloadUrl
    const coverUrl = response.data.coverUrl

    if (!downloadUrl) {
      return NextResponse.json(
        { message: 'Failed to get download URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      downloadUrl,
      coverUrl,
      success: true
    })
  } catch (error: any) {
    console.error('Error downloading TikTok video:', error)
    
    // Check for specific error messages
    const errorMessage = error.response?.data?.message || error.message
    
    if (errorMessage === 'Invalid Session') {
      return NextResponse.json(
        { 
          message: 'The download session has expired. Please try again with a fresh TikTok URL.',
          success: false,
          isSessionError: true
        },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { 
        message: errorMessage || 'Failed to download video',
        success: false
      },
      { status: 500 }
    )
  }
} 