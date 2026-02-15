'use client'

import { useState, useEffect, Suspense } from 'react'
import Image from "next/image";
import { useSearchParams } from 'next/navigation'

function UploadContent() {
  const searchParams = useSearchParams()
  // We expect the URL to be passed as 'upload_url' parameter
  // Example: /?upload_url=https://...
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)

  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    // Check query params first
    const urlFromQuery = searchParams.get('upload_url')
    if (urlFromQuery) {
      setUploadUrl(urlFromQuery)
    } else {
      // Fallback: Check hash params (if FlutterFlow sends it there)
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const urlFromHash = params.get('upload_url')
      if (urlFromHash) {
        setUploadUrl(urlFromHash)
      }
    }
  }, [searchParams])

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!uploadUrl) {
        throw new Error('No upload URL found. Please access this page from the app.')
      }

      setUploading(true)
      setStatus('Uploading...')

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = event.target.files[0]

      // Perform simple PUT request to the signed URL
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      })

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`)
      }

      setStatus('Upload successful! You can close this window.')
      setIsSuccess(true)

    } catch (error: any) {
      console.error(error)
      setStatus('Error: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  if (!uploadUrl) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
        <p className="font-bold">Missing Configuration</p>
        <p>No upload URL detected. Please launch this page from the FlutterFlow app.</p>
      </div>
    )
  }

  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="text-xl font-bold mb-4">Upload Photo</h2>

      {!isSuccess ? (
        <div className="border-t pt-4 mt-4">
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
          />
          {uploading && <p className="mt-2 text-gray-500">Uploading...</p>}
        </div>
      ) : (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mt-4" role="alert">
          <p className="font-bold">Success</p>
          <p>Your photo has been uploaded securely.</p>
        </div>
      )}

      {status && !isSuccess && <p className={`mt-2 ${status.startsWith('Error') ? 'text-red-500' : 'text-blue-500'}`}>{status}</p>}
    </div>
  )
}

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-4xl font-bold mb-8">
          Photo Uploader
        </h1>
        <Suspense fallback={<div>Loading...</div>}>
          <UploadContent />
        </Suspense>
      </main>
    </div>
  );
}
