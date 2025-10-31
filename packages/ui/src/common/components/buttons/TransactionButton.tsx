import React, { ReactNode } from 'react'
import { ReactElement } from 'react-markdown/lib/react-markdown'

import { useResponsive } from '@/common/hooks/useResponsive'
import { useTransactionStatus } from '@/common/hooks/useTransactionStatus'

import { Tooltip } from '../Tooltip'

import { ButtonGhost, ButtonPrimary, ButtonProps, ButtonSecondary } from '.'

interface WrapperProps {
  children: ReactNode
  isResponsive?: boolean
  tooltip: { [key: string]: string }
}

export const TransactionButtonWrapper = ({ children, isResponsive, tooltip }: WrapperProps) => {
  const { isTransactionPending } = useTransactionStatus()
  const { size } = useResponsive()

  if (!isResponsive && (size === 'xxs' || size === 'xs')) return null

  if (isTransactionPending) {
    return <Tooltip tooltipText="Please wait until the current transaction is over">{children}</Tooltip>
  }

  if (tooltip) {
    return (
      <Tooltip placement="bottom-end" {...tooltip}>
        {children}
      </Tooltip>
    )
  }

  return <>{children}</>
}

type StyleOption = 'primary' | 'ghost' | 'secondary'

interface TransactionButtonProps extends ButtonProps {
  style: StyleOption
  tooltip: { [key: string]: string }
  isResponsive?: boolean
}

export const TransactionButton = ({ isResponsive, disabled, style, ...props }: TransactionButtonProps) => {
  const { isTransactionPending } = useTransactionStatus()

  const Button = buttonTypes[style]

  return (
    <TransactionButtonWrapper isResponsive={isResponsive} tooltip={props.tooltip}>
      <Button {...props} disabled={isTransactionPending || props.disabled} />
    </TransactionButtonWrapper>
  )
}

const buttonTypes: Record<StyleOption, (props: ButtonProps) => ReactElement> = {
  primary: ButtonPrimary,
  secondary: ButtonSecondary,
  ghost: ButtonGhost,
}
