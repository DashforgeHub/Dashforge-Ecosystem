export interface InputLink {
  id: string
  source: string
  url: string
  metadata?: Record<string, any>
}

export interface InputLinkResult {
  success: boolean
  link?: InputLink
  error?: string
}

export class InputLinkHandler {
  private links = new Map<string, InputLink>()

  register(link: InputLink): InputLinkResult {
    if (this.links.has(link.id)) {
      return { success: false, error: `Link with id "${link.id}" already exists.` }
    }
    this.links.set(link.id, link)
    return { success: true, link }
  }

  get(id: string): InputLinkResult {
    const link = this.links.get(id)
    return link
      ? { success: true, link }
      : { success: false, error: `No link found for id "${id}".` }
  }

  list(): InputLink[] {
    return [...this.links.values()]
  }

  unregister(id: string): boolean {
    return this.links.delete(id)
  }

  update(id: string, patch: Partial<InputLink>): InputLinkResult {
    const existing = this.links.get(id)
    if (!existing) {
      return { success: false, error: `No link found for id "${id}".` }
    }
    const updated = { ...existing, ...patch, id: existing.id }
    this.links.set(id, updated)
    return { success: true, link: updated }
  }

  has(id: string): boolean {
    return this.links.has(id)
  }

  clear(): void {
    this.links.clear()
  }
}
