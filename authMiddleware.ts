import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  // const token = 'your-django-rest-auth-token' // Replace with actual token retrieval logic

  // Clone the request headers and add the token
  const requestHeaders = new Headers(req.headers)

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (token && token.accessToken) {
    requestHeaders.set('Authorization', `Token ${token.accessToken}`)
  } else {
    console.error('Token is null or does not have an accessToken property')
  }

  // Create a new request with the updated headers
  const modifiedReq = new Request(req.url, {
    method: req.method,
    headers: requestHeaders,
    body: req.body,
    redirect: req.redirect,
  })

  return NextResponse.next({
    request: modifiedReq,
  })
}
