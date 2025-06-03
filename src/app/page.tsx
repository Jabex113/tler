'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { FaDownload, FaPaste, FaSpinner, FaExclamationTriangle, FaRedo, FaTimes, FaExternalLinkAlt } from 'react-icons/fa'

const JumpingDots = () => {
  return (
    <div className="flex space-x-1 justify-center items-center">
      <span className="sr-only">Loading...</span>
      <div className="h-2 w-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="h-2 w-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="h-2 w-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
    </div>
  )
}

const Modal = ({ isOpen, onClose, children }: { isOpen: boolean, onClose: () => void, children: React.ReactNode }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full relative border border-gray-700 shadow-xl">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <FaTimes />
        </button>
        {children}
      </div>
    </div>
  );
};

interface VideoData {
  downloadUrl: string;
  coverUrl?: string;
  success: boolean;
}

// Check if URL is a valid TikTok URL (supporting all formats)
const isTikTokUrl = (url: string): boolean => {
  const tiktokDomains = [
    'tiktok.com',
    'www.tiktok.com',
    'm.tiktok.com',
    'vm.tiktok.com',
    'vt.tiktok.com',
    'tiktok'
  ];
  
  try {
    // For URLs without protocol
    if (!url.includes('://')) {
      url = 'https://' + url;
    }
    
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    return tiktokDomains.some(domain => hostname.includes(domain));
  } catch {
    // If URL parsing fails, check for simple substring matches
    return tiktokDomains.some(domain => url.toLowerCase().includes(domain));
  }
};

// Normalize TikTok URL to ensure API compatibility
const normalizeTikTokUrl = (url: string): string => {
  // If URL doesn't have protocol, add it
  if (!url.includes('://')) {
    url = 'https://' + url;
  }
  
  // Clean up any tracking parameters
  try {
    const urlObj = new URL(url);
    return urlObj.toString();
  } catch {
    return url;
  }
};

export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSessionError, setIsSessionError] = useState(false)
  const [downloadLink, setDownloadLink] = useState('')
  const [videoData, setVideoData] = useState<VideoData | null>(null)
  const [showApiKeyWarning, setShowApiKeyWarning] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const checkApiSetup = async () => {
      try {
        const response = await fetch('/api/download', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: 'test' }),
        })
        
        const data = await response.json()
        
        if (data.message && 
            (data.message.includes('API key') || 
             data.message.includes('RAPIDAPI_KEY') || 
             data.message.includes('authentication'))) {
          setShowApiKeyWarning(true)
        }
      } catch {
        // Silently handle error
      }
    }
    
    checkApiSetup()
  }, [])

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (isTikTokUrl(text)) {
        setUrl(text)
        setError('')
        setIsSessionError(false)
      } else {
        setError('Clipboard content is not a valid TikTok URL')
      }
    } catch {
      setError('Failed to read from clipboard. Please paste the URL manually.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url.trim()) {
      setError('Please enter a TikTok URL')
      return
    }

    if (!isTikTokUrl(url)) {
      setError('Please enter a valid TikTok URL')
      return
    }

    const normalizedUrl = normalizeTikTokUrl(url);
    setLoading(true)
    setError('')
    setIsSessionError(false)
    setDownloadLink('')
    setVideoData(null)

    try {
      console.log("Sending request with URL:", normalizedUrl);
      
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ url: normalizedUrl }),
      })

      const data = await response.json().catch(() => ({ message: 'Failed to parse response' }))
      
      console.log("API response:", data);

      if (!response.ok) {
        if (data.isSessionError) {
          setIsSessionError(true)
        }
        throw new Error(data.message || `Request failed with status ${response.status}`)
      }

      if (!data.downloadUrl) {
        throw new Error('No download URL returned')
      }

      setVideoData(data)
      setDownloadLink(data.downloadUrl)
      setLoading(false)
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred while downloading the video'
      console.error("Error:", errorMsg);
      setError(errorMsg)
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!downloadLink) return
    
    try {
      setIsDownloading(true)
      
      const filename = 'tiktok-video.mp4'
      
      const link = document.createElement('a')
      link.href = downloadLink
      link.download = filename
      document.body.appendChild(link)
      
      link.click()
      
      document.body.removeChild(link)
      
      setTimeout(() => {
        setIsDownloading(false)
      }, 2000)
    } catch (error) {
      console.error('Download error:', error)
      setError('Failed to download video. Please try again.')
      setIsDownloading(false)
    }
  }

  const refreshUrl = () => {
    setUrl('')
    setError('')
    setIsSessionError(false)
  }

  const openModal = () => {
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-24 bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="w-full max-w-3xl mx-auto">
        {showApiKeyWarning && (
          <div className="bg-yellow-500 text-black p-4 rounded-lg mb-8 flex items-center">
            <FaExclamationTriangle className="text-xl mr-2" />
            <div>
              <p className="font-bold">API Key Setup Required</p>
              <p className="text-sm">Please set up your RapidAPI key in the .env.local file. See README.md for instructions.</p>
            </div>
          </div>
        )}
        
        <div className="text-center mb-12">
          <div className="flex justify-center items-center mb-4">
            <Image 
              src="/images/tiktok-logo.png"
              alt="TikTok Logo"
              width={120}
              height={120}
              className="mr-4"
            />
            <h1 className="text-4xl font-bold">TikTok Downloader</h1>
          </div>
          <p className="text-lg text-gray-300">Download TikTok videos without watermark in high quality</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 shadow-2xl mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div className="flex">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => { 
                    setUrl(e.target.value)
                    if (isSessionError) setIsSessionError(false)
                  }}
                  placeholder="Paste TikTok video URL here..."
                  className="w-full px-4 py-3 rounded-l-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="bg-gray-600 hover:bg-gray-500 px-4 rounded-r-lg flex items-center justify-center"
                  title="Paste from clipboard"
                >
                  <FaPaste className="text-white" />
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm">
                <p>{error}</p>
                {isSessionError && (
                  <button 
                    type="button"
                    onClick={refreshUrl}
                    className="flex items-center mt-2 text-cyan-400 hover:text-cyan-300"
                  >
                    <FaRedo className="mr-1" /> Try with a fresh URL
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" /> Processing...
                </>
              ) : (
                <>
                  <FaDownload className="mr-2" /> Download Video
                </>
              )}
            </button>
          </form>
        </div>

        {downloadLink && videoData && (
          <div className="bg-gray-800 rounded-xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Download Ready!</h2>
            
            {videoData.coverUrl && (
              <div className="flex justify-center mb-4">
                <Image 
                  src={videoData.coverUrl} 
                  alt="Video thumbnail"
                  width={200}
                  height={200}
                  className="rounded-lg"
                />
              </div>
            )}
            
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="block w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 text-center"
            >
              {isDownloading ? (
                <JumpingDots />
              ) : (
                <>
                  <FaDownload className="inline mr-2" /> Download Now
                </>
              )}
            </button>
          </div>
        )}
        
        <div 
          className="fixed bottom-4 right-8 opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
          onClick={openModal}
        >
          <span className="text-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-transparent bg-clip-text">
            Jabez
          </span>
        </div>

        <Modal isOpen={isModalOpen} onClose={closeModal}>
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-500 to-pink-500 text-transparent bg-clip-text">Thank You!</h3>
            <p className="mb-4 text-gray-300">Hopefully you appreciate my work! Check out more of my projects in my portfolio.</p>
            
            <a 
              href="https://port-eight-livid.vercel.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
            >
              Visit My Portfolio <FaExternalLinkAlt className="ml-2" />
            </a>
          </div>
        </Modal>
      </div>
    </main>
  )
}
