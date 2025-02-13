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

export interface manuscriptItem {
  repository_name: string
  repository_city: string
  shelfmark: string
  catalogue_numbers: string[]
  date: string
  type: string
  number_of_images: number
  issuer_name: string
  named_beneficiary: string
}
