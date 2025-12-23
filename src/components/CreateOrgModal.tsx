import { authClient } from "@/auth/auth-client"
import { getOrgsFn, setOrgCreatorAsAdminFn } from "@/fn"
import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"

export const CreateOrgModal = () => {
  const navigate = useNavigate()
  const [orgName, setOrgName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleCreateOrg = async () => {
    setIsLoading(true)
    try {
      const result = await authClient.organization.create({
        name: orgName,
        slug: orgName.toLowerCase().replace(/ /g, "-"),
      })
      // Set the creator as admin
      if (result?.data?.id) {
        try {
          await setOrgCreatorAsAdminFn({
            data: { organizationId: result.data.id },
          })
        } catch (adminError) {
          console.error("Failed to set admin role:", adminError)
          // Continue anyway - organization was created successfully
        }
      }
      navigate({ to: "/" })
    } catch (error) {
      console.error("Failed to create organization:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center"
      onClick={async () => {
        const orgs = await getOrgsFn()
        if (orgs.length !== 0) {
          navigate({ to: "/" })
        }
      }}
    >
      <div
        className="bg-white w-400 p-30 rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div className="text-2xl font-bold mb-20">Create Organization</div>
          <div>
            <input
              className="bg-black/10 p-8 rounded-lg w-full mb-8"
              type="text"
              placeholder="Organization Name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
            <button
              onClick={handleCreateOrg}
              className="bg-black text-white p-8 rounded-lg w-full disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
