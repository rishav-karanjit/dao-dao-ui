export interface CopyToClipboardProps {
  value: string
  label?: string
  success?: string
  takeN?: number
  takeStartEnd?: {
    start: number
    end: number
  }
  takeAll?: true
  className?: string
  textClassName?: string
  onCopy?: () => void
  tooltip?: string
  noCopy?: boolean
}
