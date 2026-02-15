import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0"

serve(async (req) => {
    try {
        // 1. Create Supabase Client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // 2. Get User from Auth Header
        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) {
            return new Response("Unauthorized", { status: 401 })
        }

        // 3. Generate a unique filename
        const fileExt = 'png'; // Default or from req params if needed
        const fileName = `${crypto.randomUUID()}.${fileExt}`
        const filePath = `uploads/${user.id}/${fileName}`

        // 4. Create Signed Upload URL
        // access_token is implied by the storage policy or we use service_role if needed? 
        // Actually, 'createSignedUploadUrl' creates a URL that allows uploading to that specific path.
        const { data, error } = await supabaseClient
            .storage
            .from('photos')
            .createSignedUploadUrl(filePath)

        if (error) throw error

        return new Response(
            JSON.stringify({
                upload_url: data.signedUrl,
                path: filePath,
                token: data.token // The token part of the URL
            }),
            { headers: { "Content-Type": "application/json" } },
        )
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { "Content-Type": "application/json" },
            status: 400,
        })
    }
})
