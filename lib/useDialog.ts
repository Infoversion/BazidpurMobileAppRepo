import { useState } from 'react'

type DialogType = 'error' | 'success' | 'info'

interface DialogState {
  visible: boolean
  type: DialogType
  title: string
  detail?: string
}

export function useDialog() {
  const [dialog, setDialog] = useState<DialogState>({ visible: false, type: 'error', title: '' })

  function show(type: DialogType, title: string, detail?: string) {
    setDialog({ visible: true, type, title, detail })
  }

  function hide() {
    setDialog(d => ({ ...d, visible: false }))
  }

  return { dialog, show, hide }
}
