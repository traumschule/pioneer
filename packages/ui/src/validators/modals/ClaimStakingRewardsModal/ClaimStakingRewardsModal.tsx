import BN from 'bn.js'
import React, { useMemo } from 'react'
import { combineLatest, map, of, switchMap } from 'rxjs'

import { useMyAccounts } from '@/accounts/hooks/useMyAccounts'
import { Account } from '@/accounts/types'
import { useApi } from '@/api/hooks/useApi'
import { FailureModal } from '@/common/components/FailureModal'
import { Modal, ModalBody, ModalHeader, ModalTransactionFooter } from '@/common/components/Modal'
import { RowGapBlock } from '@/common/components/page/PageContent'
import { SuccessModal } from '@/common/components/SuccessModal'
import { TextMedium } from '@/common/components/typography'
import { BN_ZERO, ERA_DEPTH } from '@/common/constants'
import { useMachine } from '@/common/hooks/useMachine'
import { useModal } from '@/common/hooks/useModal'
import { useObservable } from '@/common/hooks/useObservable'
import { useSignAndSendTransaction } from '@/common/hooks/useSignAndSendTransaction'
import { transactionMachine } from '@/common/model/machines'

import { ClaimStakingRewardsModalCall } from '.'

interface ValidatorClaimableRewards {
  address: string
  account: Account | undefined
  unclaimedEras: number[]
  totalClaimable: BN
}

export const ClaimStakingRewardsModal = () => {
  const { hideModal } = useModal<ClaimStakingRewardsModalCall>()
  const { api } = useApi()
  const { allAccounts } = useMyAccounts()
  const [state, , service] = useMachine(transactionMachine)

  const validatorsRewards = useObservable<ValidatorClaimableRewards[] | undefined>(() => {
    if (!api || !allAccounts.length) return of(undefined)

    const addresses = allAccounts.map((account) => account.address)

    const eraInfo$ = api.query.staking.activeEra().pipe(
      map((activeEra) => {
        if (activeEra.isNone) return undefined
        const currentEra = activeEra.unwrap().index.toNumber()
        return { currentEra, oldestEra: Math.max(0, currentEra - ERA_DEPTH) }
      })
    )

    return eraInfo$.pipe(
      switchMap((eraInfo) => {
        if (!eraInfo) return of([])

        const { currentEra, oldestEra } = eraInfo

        const accountRewards$ = addresses.map((address) =>
          api.query.staking.bonded(address).pipe(
            switchMap((bonded) => {
              if (bonded.isNone) return of(null)

              const controller = bonded.unwrap().toString()
              return api.query.staking.ledger(controller).pipe(
                switchMap((ledger) => {
                  if (ledger.isNone) return of(null)

                  const ledgerData = ledger.unwrap()
                  const claimedRewards = ledgerData.claimedRewards.map((era) => era.toNumber())

                  const unclaimedEras: number[] = []
                  for (let era = oldestEra; era < currentEra; era++) {
                    if (!claimedRewards.includes(era)) {
                      unclaimedEras.push(era)
                    }
                  }

                  if (unclaimedEras.length === 0) return of(null)

                  const erasRewards$ = api.derive.staking.erasRewards()
                  const erasPoints$ = api.derive.staking.erasPoints()

                  return combineLatest([erasRewards$, erasPoints$]).pipe(
                    map(([erasRewards, erasPoints]) => {
                      const rewardsByEra = new Map(erasRewards.map((reward: any) => [reward.era.toNumber(), reward]))
                      const pointsByEra = new Map(erasPoints.map((points: any) => [points.era.toNumber(), points]))

                      let totalClaimable = BN_ZERO

                      unclaimedEras.forEach((era) => {
                        const reward = rewardsByEra.get(era)
                        const points = pointsByEra.get(era)

                        if (!reward || !points || reward.eraReward.isZero()) return

                        const totalPoints = points.eraPoints.toNumber()
                        if (totalPoints === 0) return

                        const validatorPoints = points.validators[address]
                        if (validatorPoints) {
                          const validatorPointsNum = validatorPoints.toNumber()
                          const validatorReward = reward.eraReward.muln(validatorPointsNum).divn(totalPoints)
                          totalClaimable = totalClaimable.add(validatorReward)
                        }
                      })

                      return {
                        address,
                        account: allAccounts.find((acc) => acc.address === address),
                        unclaimedEras,
                        totalClaimable,
                      }
                    })
                  )
                })
              )
            })
          )
        )

        return combineLatest(accountRewards$).pipe(
          map((rewards: (ValidatorClaimableRewards | null)[]) =>
            rewards.filter((r): r is ValidatorClaimableRewards => r !== null && !r.totalClaimable.isZero())
          )
        )
      })
    )
  }, [api?.isConnected, JSON.stringify(allAccounts.map((a) => a.address))])

  const totals = useMemo(() => {
    if (!validatorsRewards) return { totalClaimable: BN_ZERO, totalEras: 0, accountsCount: 0, batchedEras: 0 }

    const totalClaimable = validatorsRewards.reduce((sum, v) => sum.add(v.totalClaimable), BN_ZERO)
    const totalEras = validatorsRewards.reduce((sum, v) => sum + v.unclaimedEras.length, 0)

    const batchedEras = Math.min(totalEras, 40)

    return {
      totalClaimable,
      totalEras,
      batchedEras,
      accountsCount: validatorsRewards.length,
    }
  }, [validatorsRewards])

  const transaction = useMemo(() => {
    if (!api || !validatorsRewards || validatorsRewards.length === 0) return undefined

    const payoutCalls = validatorsRewards.flatMap((validator) =>
      validator.unclaimedEras.map((era: number) => api.tx.staking.payoutStakers(validator.address, era))
    )

    const limitedCalls = payoutCalls.slice(0, 40)

    return limitedCalls.length === 0
      ? undefined
      : limitedCalls.length === 1
      ? limitedCalls[0]
      : api.tx.utility.batchAll(limitedCalls)
  }, [api, validatorsRewards])

  const signerAccount = allAccounts[0]

  const { isReady, sign, paymentInfo, canAfford } = useSignAndSendTransaction({
    transaction,
    signer: signerAccount?.address ?? '',
    service: service as any,
    skipQueryNode: true,
  })

  if (state.matches('error')) {
    return (
      <FailureModal onClose={hideModal} events={state.context.events}>
        There was a problem with claiming staking rewards
      </FailureModal>
    )
  }

  if (state.matches('success')) {
    return <SuccessModal onClose={hideModal} text="You have successfully claimed your staking rewards" />
  }

  if (!validatorsRewards || validatorsRewards.length === 0) {
    return (
      <Modal onClose={hideModal} modalSize="s" modalHeight="s">
        <ModalHeader title="Claim Staking Rewards" onClick={hideModal} />
        <ModalBody>
          <TextMedium>No claimable staking rewards found for your validator accounts.</TextMedium>
        </ModalBody>
        <ModalTransactionFooter next={{ onClick: hideModal, label: 'Close' }} />
      </Modal>
    )
  }

  if (state.matches('prepare')) {
    const hasMoreThanLimit = totals.totalEras > totals.batchedEras

    return (
      <Modal onClose={hideModal} modalSize="s" modalHeight="s">
        <ModalHeader title="Claim Staking Rewards" onClick={hideModal} />
        <ModalBody>
          <RowGapBlock gap={20}>
            <TextMedium>
              You are about to claim rewards from {totals.batchedEras} unclaimed era
              {totals.batchedEras !== 1 ? 's' : ''} across {totals.accountsCount} validator account
              {totals.accountsCount !== 1 ? 's' : ''}.
            </TextMedium>
            {hasMoreThanLimit && (
              <TextMedium lighter>
                ℹ️ Due to transaction limits, this will claim {totals.batchedEras} of {totals.totalEras} unclaimed eras.
                Run this action again to claim the remaining eras.
              </TextMedium>
            )}
            {!canAfford && <TextMedium lighter>⚠️ Insufficient balance to cover transaction fee.</TextMedium>}
          </RowGapBlock>
        </ModalBody>
        <ModalTransactionFooter
          transactionFee={paymentInfo?.partialFee}
          next={{
            onClick: () => sign(),
            label: hasMoreThanLimit ? 'Sign and claim batch' : 'Sign and claim all',
            disabled: !isReady || !canAfford,
          }}
        />
      </Modal>
    )
  }

  return null
}
