import React, { useMemo } from 'react'
import styled from 'styled-components'

import { AccountInfo } from '@/accounts/components/AccountInfo'
import { ButtonGhost, ButtonPrimary } from '@/common/components/buttons'
import { TransactionButtonWrapper } from '@/common/components/buttons/TransactionButton'
import { PercentageChart } from '@/common/components/charts/PercentageChart'
import { EditSymbol } from '@/common/components/icons/symbols'
import { DeleteSymbol } from '@/common/components/icons/symbols/DeleteSymbol'
import { TableListItemAsLinkHover } from '@/common/components/List'
import { Skeleton } from '@/common/components/Skeleton'
import { TextBig, TokenValue } from '@/common/components/typography'
import { BorderRad, Colors, Sizes, Transitions } from '@/common/constants'
import { ValidatorWithDetails } from '@/validators/types/Validator'

interface ValidatorItemProps {
  validator: ValidatorWithDetails
}
export const NorminatorDashboardItem = ({ validator }: ValidatorItemProps) => {
  const { stashAccount, totalRewards } = validator
  const validatorAccount = useMemo(
    () => ({
      name: 'unknown',
      address: stashAccount,
      source: '',
    }),
    [validator]
  )

  const daysApr: number = -0.3

  return (
    <ValidatorItemWrapper>
      <ValidatorItemWrap key={stashAccount} onClick={() => alert('here comes the handler which shows validator card')}>
        <AccountInfo account={validatorAccount} />
        <TokenValue value={totalRewards} />

        <PercentageChart percentage={10} />
        <TextBig>{-12}%</TextBig>
        <TextBig>
          {daysApr > 0 ? <span style={{ color: 'red' }}>{daysApr}</span> : <span color="green">{daysApr}</span>}%
        </TextBig>
        <TextBig>{3}</TextBig>

        <TokenValue value={totalRewards} />
        <TokenValue value={totalRewards} />
        <ButtonPrimary size="small" onClick={() => alert(`You select validator:${stashAccount} to nominate`)}>
          {' '}
          Nominate{' '}
        </ButtonPrimary>
        <TransactionButtonWrapper>
          <ButtonForTransfer size="small" square onClick={() => {}}>
            <EditSymbol />
          </ButtonForTransfer>
        </TransactionButtonWrapper>
        <TransactionButtonWrapper>
          <ButtonForTransfer size="small" square onClick={() => {}}>
            <DeleteSymbol />
          </ButtonForTransfer>
        </TransactionButtonWrapper>
      </ValidatorItemWrap>
    </ValidatorItemWrapper>
  )
}
const ButtonForTransfer = styled(ButtonGhost)`
  z-index: 1;
  svg {
    color: ${Colors.Black[900]};
  }
`
const ValidatorItemWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid ${Colors.Black[100]};
  border-radius: ${BorderRad.s};
  cursor: pointer;
  transition: ${Transitions.all};
  ${TableListItemAsLinkHover}
`

export const ValidatorItemWrap = styled.div`
  display: grid;
  grid-template-columns: 224px 120px 57px 40px 50px 34px 120px 120px 90px 30px 30px;
  grid-template-rows: 1fr;
  justify-content: space-between;
  justify-items: start;
  align-items: center;
  width: 100%;
  height: ${Sizes.accountHeight};
  padding: 16px 8px 16px 16px;
  margin-left: -1px;
  ${Skeleton} {
    min-width: 80%;
    height: 1.2rem;
  }
`
