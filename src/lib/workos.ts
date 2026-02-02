import { WorkOS } from "@workos-inc/node"

export const workos = new WorkOS(process.env.WORKOS_API_KEY)

export function getWorkosAuthUrl(connectionId: string, redirectUri: string) {
  return workos.sso.getAuthorizationUrl({
    connection: connectionId,
    clientId: process.env.WORKOS_CLIENT_ID!,
    redirectUri,
  })
}

export async function getWorkosProfile(code: string) {
  return workos.sso.getProfileAndToken({
    code,
    clientId: process.env.WORKOS_CLIENT_ID!,
  })
}
