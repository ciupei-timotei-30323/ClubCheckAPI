"use server"

import { revalidatePath, updateTag } from "next/cache"

export async function retryEvents(): Promise<void> {
  updateTag("events")
  updateTag("facets")
  revalidatePath("/")
}
