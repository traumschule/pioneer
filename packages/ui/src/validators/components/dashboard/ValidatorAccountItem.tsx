import React, { useState } from 'react'
import styled from 'styled-components'

import { AccountInfo } from '@/accounts/components/AccountInfo'
import { useBalance } from '@/accounts/hooks/useBalance'
import { Account } from '@/accounts/types'
import { TransactionButtonWrapper } from '@/common/components/buttons/TransactionButton'
import { TableListItemAsLinkHover } from '@/common/components/List'
import { Skeleton } from '@/common/components/Skeleton'
import { TokenValue } from '@/common/components/typography'
import { BorderRad, Colors, Sizes, Transitions } from '@/common/constants'
import { isDefined, sumBN } from '@/common/utils'

import { ValidatorOverViewClaimButton } from '../styles'

interface AccountItemDataProps {
  account: Account
}

export const ValidatorAccountItem = ({ account }: AccountItemDataProps) => {
  const address = account.address
  const balance = useBalance(address)

  const [isDropped, setDropped] = useState(false)

  return (
    <AccountItemWrapper>
      <AccountItemWrap key={address} onClick={() => setDropped(!isDropped)}>
        <AccountInfo account={account} />
        <TokenValue value={balance?.total} isLoading={!isDefined(balance?.total)} />
        <TokenValue
          value={sumBN(balance?.recoverable, balance?.vestedClaimable)}
          isLoading={!isDefined(balance?.recoverable)}
        />
        <TransactionButtonWrapper>
          <ValidatorOverViewClaimButton size="small">Claim Reward</ValidatorOverViewClaimButton>
        </TransactionButtonWrapper>
      </AccountItemWrap>
    </AccountItemWrapper>
  )
}

const AccountItemWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid ${Colors.Black[100]};
  border-radius: ${BorderRad.s};
  cursor: pointer;
  transition: ${Transitions.all};

  ${TableListItemAsLinkHover}
`

export const AccountItemWrap = styled.div`
  display: grid;
  grid-template-columns: 276px repeat(2, 128px) 104px;
  grid-template-rows: 1fr;
  justify-content: space-between;
  justify-items: end;
  align-items: center;
  width: 100%;
  height: ${Sizes.accountHeight};
  padding: 16px 8px 16px 16px;
  margin-left: -1px;

  ${Skeleton} {
    min-width: 100%;
    height: 1.2rem;
  }
`
