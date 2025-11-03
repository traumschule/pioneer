import React, { useState } from 'react'
import { map, of, switchMap } from 'rxjs'
import styled from 'styled-components'

import { AccountInfo } from '@/accounts/components/AccountInfo'
import { useBalance } from '@/accounts/hooks/useBalance'
import { Account } from '@/accounts/types'
import { useApi } from '@/api/hooks/useApi'
import { TransactionButtonWrapper } from '@/common/components/buttons/TransactionButton'
import { TableListItemAsLinkHover } from '@/common/components/List'
import { Skeleton } from '@/common/components/Skeleton'
import { TokenValue } from '@/common/components/typography'
import { BorderRad, Colors, ERA_DEPTH, Sizes, Transitions } from '@/common/constants'
import { useModal } from '@/common/hooks/useModal'
import { useObservable } from '@/common/hooks/useObservable'
import { isDefined, sumBN } from '@/common/utils'

import { ValidatorOverViewClaimButton } from '../styles'

interface AccountItemDataProps {
  account: Account
}

export const ValidatorAccountItem = ({ account }: AccountItemDataProps) => {
  const address = account.address
  const balance = useBalance(address)
  const { showModal } = useModal()
  const { api } = useApi()

  const [isDropped, setDropped] = useState(false)

  // Check if account has claimable rewards
  const hasClaimableRewards = useObservable(() => {
    if (!api || !address) return of(false)

    const eraInfo$ = api.query.staking.activeEra().pipe(
      map((activeEra) => {
        if (activeEra.isNone) return undefined
        const currentEra = activeEra.unwrap().index.toNumber()
        return { currentEra, oldestEra: Math.max(0, currentEra - ERA_DEPTH) }
      })
    )

    return eraInfo$.pipe(
      switchMap((eraInfo) => {
        if (!eraInfo) return of(false)

        return api.query.staking.bonded(address).pipe(
          switchMap((bonded) => {
            if (bonded.isNone) return of(false)

            const controller = bonded.unwrap().toString()
            return api.query.staking.ledger(controller).pipe(
              map((ledger) => {
                if (ledger.isNone) return false

                const ledgerData = ledger.unwrap()
                const claimedRewards = ledgerData.claimedRewards.map((era) => era.toNumber())

                // Check if there are any unclaimed eras within history depth
                for (let era = eraInfo.oldestEra; era < eraInfo.currentEra; era++) {
                  if (!claimedRewards.includes(era)) {
                    return true
                  }
                }

                return false
              })
            )
          })
        )
      })
    )
  }, [api?.isConnected, address])

  const handleClaimReward = (e: React.MouseEvent) => {
    e.stopPropagation()
    showModal({ modal: 'ClaimStakingRewardsModal', data: { address } })
  }

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
          <ValidatorOverViewClaimButton size="small" disabled={!hasClaimableRewards} onClick={handleClaimReward}>
            Claim Reward
          </ValidatorOverViewClaimButton>
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
