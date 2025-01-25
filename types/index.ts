export interface LoginResponse {
  auth_token: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface UserProfile {
  id: number
  email: string
  username: string
}

export interface CarouselItem {
  id: number
  title: string
  image: string
  description: string
}

export interface CarouselItem {
  title: string
  image: string
  link: string
}
