const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function loginUser(username: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/token/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })

  if (!response.ok) {
    throw new Error('Login failed')
  }

  return response.json()
}

export async function logoutUser(token: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/token/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Logout failed')
  }
}

export async function getUserProfile(token: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/profile`, {
    headers: {
      Authorization: `Token ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user profile')
  }

  return response.json()
}

export async function getCarouselItems(token: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/media/carousel-items/`, {
    headers: {
      Authorization: `Token ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch carousel items')
  }

  return response.json()
}

export async function getPublications(params: {
  is_news?: boolean
  is_featured?: boolean
  is_blog_post?: boolean
}) {
  const searchParams = new URLSearchParams()

  if (params.is_news) searchParams.append('is_news', 'true')
  if (params.is_featured) searchParams.append('is_featured', 'true')
  if (params.is_blog_post) searchParams.append('is_blog_post', 'true')

  const url = `${API_BASE_URL}/api/v1/media/publications/${
    searchParams.toString() ? `?${searchParams.toString()}` : ''
  }`

  const res = await fetch(url)
  console.log('🚀 ~ res:', res)
  if (!res.ok) throw new Error('Failed to fetch publications')

  return res.json()
}
