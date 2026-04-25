const USER_ID_KEY = 'work_pass_dinosaur_user_id'
const DISPLAY_NAME_KEY = 'work_pass_dinosaur_display_name'
const GOOGLE_LINKED_KEY = 'work_pass_dinosaur_google_linked'
export const PENDING_LINK_KEY = 'work_pass_dinosaur_pending_link'

export function getUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY)
}

export function getDisplayName(): string | null {
  return localStorage.getItem(DISPLAY_NAME_KEY)
}

export function getGoogleLinked(): boolean {
  return localStorage.getItem(GOOGLE_LINKED_KEY) === 'true'
}

export function setUser(userId: string, displayName: string, googleLinked = false): void {
  localStorage.setItem(USER_ID_KEY, userId)
  localStorage.setItem(DISPLAY_NAME_KEY, displayName)
  localStorage.setItem(GOOGLE_LINKED_KEY, String(googleLinked))
}

export function setGoogleLinked(value: boolean): void {
  localStorage.setItem(GOOGLE_LINKED_KEY, String(value))
}

export function clearUser(): void {
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(DISPLAY_NAME_KEY)
  localStorage.removeItem(GOOGLE_LINKED_KEY)
  localStorage.removeItem(PENDING_LINK_KEY)
}
