import React, { useState } from 'react'
import styled from 'styled-components'

import { useBalance } from '@/accounts/hooks/useBalance'
import { Account } from '@/accounts/types'
import { TransactionButtonWrapper } from '@/common/components/buttons/TransactionButton'
import { BlockIcon } from '@/common/components/icons'
import { LinkSymbol } from '@/common/components/icons/symbols'
import { TableListItemAsLinkHover } from '@/common/components/List'
import { Skeleton } from '@/common/components/Skeleton'
import { TextBig, TextSmall, TokenValue } from '@/common/components/typography'
import { BorderRad, Colors, Sizes, Transitions } from '@/common/constants'
import { isDefined } from '@/common/utils'

interface AccountItemDataProps {
  account: Account
}

export const RewardHistoryItem = ({ account }: AccountItemDataProps) => {
  const address = account.address
  const balance = useBalance(address)

  const [isDropped, setDropped] = useState(false)

  return (
    <RewardHistoryItemWrappers>
      <AccountItemWrap key={address} onClick={() => setDropped(!isDropped)}>
        <TokenValue value={balance?.total} isLoading={!isDefined(balance?.total)} />
        <TextBig>5493</TextBig>
        {/* {block ? <BlockTime block={block} layout="reverse-start" lessInfo /> : ""} */}
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
    </RewardHistoryItemWrappers>
  )
}

const RewardHistoryItemWrappers = styled.div`
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
  grid-template-columns: 276px repeat(2, 247px) 32px;
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
