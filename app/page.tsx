'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import Image from "next/image";

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  // For debugging, status message
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      setStatus('Uploading...')

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath)

      setImageUrl(publicUrl)

      // 3. Save to Database
      if (user) {
        const { error: dbError } = await supabase
          .from('user_photos')
          .insert({
            user_id: user.id,
            image_url: publicUrl
          })
        if (dbError) throw dbError
      }

      setStatus('Upload successful!')
    } catch (error: any) {
      console.error(error)
      setStatus('Error uploading image: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-4xl font-bold mb-8">
          Welcome to Next.js App
        </h1>

        {user ? (
          <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
            <div className="mb-4">
              <p className="text-gray-700 text-sm font-bold mb-2">
                Logged in as:
              </p>
              <p className="text-xl text-blue-600">
                {user.email}
              </p>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-bold mb-4">Upload a Photo</h3>
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
              {status && <p className="mt-2 text-red-500">{status}</p>}
            </div>

            {imageUrl && (
              <div className="mt-4">
                <p className="mb-2 font-bold">Uploaded Image:</p>
                <img src={imageUrl} alt="Uploaded" className="max-w-xs mx-auto rounded shadow" />
              </div>
            )}
          </div>
        ) : (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
            <p className="font-bold">Not Logged In</p>
            <p>Please access this app from the FlutterFlow app to log in.</p>
          </div>
        )}
      </main>
    </div>
  );
}
