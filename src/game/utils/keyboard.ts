export function isTypingInFormElement(): boolean {
  if (typeof document === 'undefined') return false
  const active = document.activeElement
  if (!active) return false

  const tag = active.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if (active.getAttribute('contenteditable') === 'true') return true

  return false
}
