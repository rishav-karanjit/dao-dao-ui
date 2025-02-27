import { ComponentPropsWithoutRef, ReactNode } from 'react'

import { LinkWrapperProps } from './LinkWrapper'

export interface ButtonifierProps {
  variant?:
    | 'primary'
    | 'primary_outline'
    | 'secondary'
    | 'ghost'
    | 'ghost_outline'
    | 'underline'
    | 'none'
  size?: 'sm' | 'lg' | 'md' | 'none'
  loading?: boolean
  contentContainerClassName?: string
  pressed?: boolean
  hovering?: boolean
  disabled?: boolean
  showBadge?: boolean
  className?: string
  children?: ReactNode | ReactNode[]
  center?: boolean
  circular?: boolean
  focused?: boolean
  allowClickWhileLoading?: boolean
}

export type ButtonProps = ComponentPropsWithoutRef<'button'> & ButtonifierProps
export type ButtonLinkProps = ButtonifierProps & LinkWrapperProps
