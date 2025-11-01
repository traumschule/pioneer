import React, { useState } from 'react'
import styled from 'styled-components'

import { Account } from '@/accounts/types'
import { BadgeStatus } from '@/common/components/BadgeStatus'
import { TransactionButtonWrapper } from '@/common/components/buttons/TransactionButton'
import { BlockIcon } from '@/common/components/icons'
import { LinkSymbol } from '@/common/components/icons/symbols'
import { TableListItemAsLinkHover } from '@/common/components/List'
import { Skeleton } from '@/common/components/Skeleton'
import { TextBig, TextSmall } from '@/common/components/typography'
import { BorderRad, Colors, Sizes, Transitions } from '@/common/constants'

interface AccountItemDataProps {
  account: Account
}

export const SlashHistoryItem = ({ account }: AccountItemDataProps) => {
  const address = account.address
  const [isDropped, setDropped] = useState(false)

  return (
    <SlashHistoryItemWarppers>
      <AccountItemWrap key={address} onClick={() => setDropped(!isDropped)}>
        <BadgeStatus inverted size="l">
          Example
        </BadgeStatus>
        <TextBig>549,090</TextBig>
        {/* <BlockTime></BlockTime> */}
        <TextSmall>
          <div>01/07/2020, 10:00am CET</div>
          <div>
            <BlockIcon />
            389,829 on Babylon network
          </div>
        </TextSmall>
        <TransactionButtonWrapper>
          <LinkSymbol />
        </TransactionButtonWrapper>
      </AccountItemWrap>
    </SlashHistoryItemWarppers>
  )
}

const SlashHistoryItemWarppers = styled.div`
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
  grid-template-columns: 276px repeat(2, 228px) 104px;
  grid-template-rows: 1fr;
  justify-content: space-between;
  justify-items: start;
  align-items: center;
  width: 100%;
  height: ${Sizes.accountHeight};
  padding: 16px;
  margin: -1px;

  ${Skeleton} {
    min-width: 80%;
    height: 1.2rem;
  }
`
