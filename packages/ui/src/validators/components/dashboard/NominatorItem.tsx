import React, { useState } from 'react'
import styled, { css } from 'styled-components'

import { AccountInfo } from '@/accounts/components/AccountInfo'
import { useBalance } from '@/accounts/hooks/useBalance'
import { Account } from '@/accounts/types'
import { BlockInfoContainer, BlockNetworkInfo, BlockInfo } from '@/common/components/BlockTime/BlockInfo'
import { BlockIcon, BlockIconStyles } from '@/common/components/icons'
import { TableListItemAsLinkHover } from '@/common/components/List'
import { Skeleton } from '@/common/components/Skeleton'
import { TextMedium, TextSmall, TokenValue } from '@/common/components/typography'
import { BorderRad, Colors, Sizes, Transitions } from '@/common/constants'
import { Block } from '@/common/types'
import { isDefined, sumBN } from '@/common/utils'
interface AccountItemDataProps extends BlockTimeLayoutProps {
  account: Account
  block?: Block
  dateLabel?: string
  lessInfo?: boolean
}

interface BlockTimeLayoutProps {
  layout?: 'row' | 'column' | 'reverse' | 'reverse-start'
  position?: 'start' | 'end'
}

export const NominatorAccountItem = ({ account, block, dateLabel, lessInfo }: AccountItemDataProps) => {
  const address = account.address
  const balance = useBalance(address)

  const [isDropped, setDropped] = useState(false)

  return (
    <NominatorItemWarpper>
      <NominatorItemWarp key={address} onClick={() => setDropped(!isDropped)}>
        <AccountInfo account={account} />
        {block ? <BlockInfo block={block} lessInfo={lessInfo} /> : ''}
        <TextSmall>
          <span>{dateLabel}</span>
          <span>
            <BlockIcon />
            {block}{' '}
          </span>
        </TextSmall>
        <TokenValue
          value={sumBN(balance?.recoverable, balance?.vestedClaimable)}
          isLoading={!isDefined(balance?.recoverable)}
        />
      </NominatorItemWarp>
    </NominatorItemWarpper>
  )
}

const NominatorItemWarpper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid ${Colors.Black[100]};
  border-radius: ${BorderRad.s};
  cursor: pointer;
  transition: ${Transitions.all};

  ${TableListItemAsLinkHover}
`

export const NominatorItemWarp = styled.div`
  display: grid;
  grid-template-columns: 276px repeat(2, 213px) 133px;
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
const Separator = styled.span`
  font-size: inherit;
  line-height: inherit;
`

const AboutText = styled(TextMedium)`
  color: ${Colors.Black[600]};
  width: max-content;
`
export const BlockTimeWrapper = styled.div<BlockTimeLayoutProps>`
  display: grid;
  width: fit-content;
  height: fit-content;
  justify-items: ${({ position }) => position ?? 'start'};

  ${({ layout }) => {
    switch (layout) {
      case 'row':
        return css`
          grid-auto-flow: column;
          grid-column-gap: 8px;
          align-items: center;

          ${AboutText} {
            font-size: 12px;
            line-height: 18px;
            color: ${Colors.Black[400]};
            white-space: nowrap;
          }

          ${BlockIconStyles} {
            color: ${Colors.Black[500]};
          }

          ${Separator} {
            color: ${Colors.Black[400]};
          }
        `
      case 'column':
        return css`
          grid-row-gap: 4px;

          ${BlockIconStyles} {
            color: ${Colors.Black[900]};
          }
        `
      case 'reverse-start':
        return css`
          justify-content: start;
          grid-row-gap: 8px;

          ${AboutText} {
            font-size: 12px;
            line-height: 18px;
            color: ${Colors.Black[500]};
            order: 1;
          }

          ${BlockIconStyles} {
            color: ${Colors.Black[900]};
          }

          ${BlockInfoContainer} {
            color: ${Colors.Black[900]};
            margin-left: 0;
          }

          ${BlockNetworkInfo} {
            color: ${Colors.Black[900]};
          }
        `
      case 'reverse':
      default:
        return css`
          justify-content: end;
          text-align: right;
          grid-row-gap: 8px;

          ${AboutText} {
            font-size: 12px;
            line-height: 18px;
            color: ${Colors.Black[500]};
            order: 1;
          }

          ${BlockIconStyles} {
            color: ${Colors.Black[900]};
          }

          ${BlockInfoContainer} {
            color: ${Colors.Black[900]};
          }

          ${BlockNetworkInfo} {
            color: ${Colors.Black[900]};
          }
        `
    }
  }}
`
