export async function register() {
  console.log(`[Server] Next.js server starting...`)
  console.log(`[Server] API_URL: ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}`)
  console.log(`[Server] Node: ${process.version}`)
  console.log(`[Server] ENV: ${process.env.NODE_ENV}`)
}
