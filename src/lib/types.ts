export type Member = {
  id: string
  role: string
  userId: string | null // null = pending (user hasn't signed up yet)
  email: string
  userName: string | null
  userImage: string | null
}

export type Project = {
  id: string
  name: string
  userId: string
  organizationId: string
}

export type Package = {
  id: string
  name: string
}

export type Asset = {
  id: string
  name: string
}

