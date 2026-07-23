import { AccessError } from "@/lib/server/authorization";
import { getWorkspaceContext } from "@/lib/server/workspace-context";

export async function getOptionalWorkspaceContext() {
  try {
    return await getWorkspaceContext();
  } catch (error) {
    if (error instanceof AccessError && error.code === "AUTH_REQUIRED") return null;
    throw error;
  }
}
