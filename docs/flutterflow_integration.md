# FlutterFlow Integration Guide

To integrate your FlutterFlow app with the Next.js hybrid access system, follow these steps:

## 1. Create a "Launch URL" Action

In your FlutterFlow project, on the button or event that should open the web view:

1.  Add an action: **Launch URL**.
2.  **URL**: Set this to a specific value using a **Combine Text** or **Code Expression**.

## 2. Construct the URL

You need to pass the current user's `access_token` and `refresh_token` in the URL fragment (hash).

**Format:**
`https://your-nextjs-domain.com/sync#access_token=[ACCESS_TOKEN]&refresh_token=[REFRESH_TOKEN]&token_type=bearer`

### Steps to build this in FlutterFlow:

1.  Select **Combine Text**.
2.  **Text 1**: `https://your-nextjs-domain.com/sync#access_token=` (Replace domain with localhost:3000 for testing).
3.  **Text 2**: Select **Authenticated User** -> **Id Token** (or Access Token if available as currentAuthToken). 
    *Note: FlutterFlow exposes `currentAuthToken` which is typically the JWT access token.*
4.  **Text 3**: `&refresh_token=`
5.  **Text 4**: You might need a Custom Function to get the Refresh Token, as it's not always directly exposed in the variable picker.
    *   **Custom Function**: `getRefreshToken()` (Returns String).
6.  **Text 5**: `&token_type=bearer`

### Custom Function to get Refresh Token (Supabase)

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

String? getRefreshToken() {
  final session = Supabase.instance.client.auth.currentSession;
  return session?.refreshToken;
}
```

## 3. Testing

1.  Run your Next.js app (`npm run dev`).
2.  Run your FlutterFlow app (Test Mode or Local Run).
3.  Click the button.
4.  The browser should open `localhost:3000/sync...`.
5.  You should be redirected to the home page and logged in.
