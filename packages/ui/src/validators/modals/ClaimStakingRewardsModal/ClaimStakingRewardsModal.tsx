import BN from 'bn.js'
import React, { useEffect, useMemo, useState } from 'react'
import { combineLatest, map, of, switchMap } from 'rxjs'
import styled from 'styled-components'

import { useMyAccounts } from '@/accounts/hooks/useMyAccounts'
import { Account } from '@/accounts/types'
import { useApi } from '@/api/hooks/useApi'
import { FailureModal } from '@/common/components/FailureModal'
import { InputComponent } from '@/common/components/forms'
import { List, ListItem } from '@/common/components/List'
import { Modal, ModalBody, ModalHeader, ModalTransactionFooter } from '@/common/components/Modal'
import { RowGapBlock } from '@/common/components/page/PageContent'
import { SuccessModal } from '@/common/components/SuccessModal'
import { TextMedium, TokenValue } from '@/common/components/typography'
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
  const { hideModal, modalData = {} } = useModal<ClaimStakingRewardsModalCall>()
  const { api } = useApi()
  const { allAccounts } = useMyAccounts()
  const [state, , service] = useMachine(transactionMachine)
  const [selectedAccount, setSelectedAccount] = useState<Account>()

  // Get claimable rewards for all validator accounts
  const validatorsRewards = useObservable<ValidatorClaimableRewards[] | undefined>(() => {
    if (!api || !allAccounts.length) return of(undefined)

    const addresses = modalData?.address ? [modalData.address] : allAccounts.map((account) => account.address)

    // Get current era and history depth
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

        // Get ledger data for each address
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

                  // Find unclaimed eras within history depth
                  const unclaimedEras: number[] = []
                  for (let era = oldestEra; era < currentEra; era++) {
                    if (!claimedRewards.includes(era)) {
                      unclaimedEras.push(era)
                    }
                  }

                  if (unclaimedEras.length === 0) return of(null)

                  // Get reward points to calculate claimable amount
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
  }, [api?.isConnected, JSON.stringify(allAccounts.map((a) => a.address)), modalData?.address])

  // Auto-select if only one account or if specific address provided
  useEffect(() => {
    if (validatorsRewards && validatorsRewards.length > 0) {
      if (modalData?.address) {
        const account = validatorsRewards.find((v) => v.address === modalData.address)?.account
        if (account) setSelectedAccount(account)
      } else if (validatorsRewards.length === 1) {
        setSelectedAccount(validatorsRewards[0].account)
      }
    }
  }, [validatorsRewards, modalData?.address])

  const selectedRewards = useMemo(
    () => validatorsRewards?.find((v) => v.address === selectedAccount?.address),
    [validatorsRewards, selectedAccount]
  )

  // Create batch transaction for claiming all unclaimed eras
  const transaction = useMemo(() => {
    if (!api || !selectedRewards || !selectedRewards.unclaimedEras.length) return undefined

    const payoutCalls = selectedRewards.unclaimedEras.map((era: number) =>
      api.tx.staking.payoutStakers(selectedRewards.address, era)
    )

    return payoutCalls.length === 1 ? payoutCalls[0] : api.tx.utility.batch(payoutCalls)
  }, [api, selectedRewards])

  const { isReady, sign, paymentInfo, canAfford } = useSignAndSendTransaction({
    transaction,
    signer: selectedAccount?.address ?? '',
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
    return (
      <Modal onClose={hideModal} modalSize="s" modalHeight="l">
        <ModalHeader title="Claim Staking Rewards" onClick={hideModal} />
        <ModalBody>
          <RowGapBlock gap={20}>
            <TextMedium>
              {selectedRewards ? (
                <>
                  You are about to claim <TokenValue value={selectedRewards.totalClaimable} /> from{' '}
                  {selectedRewards.unclaimedEras.length} unclaimed era
                  {selectedRewards.unclaimedEras.length !== 1 ? 's' : ''}.
                </>
              ) : (
                <>Select the validator account for which you want to claim rewards.</>
              )}
            </TextMedium>
            <RowGapBlock gap={8}>
              <ItemHeaders>
                <Header>Validator Account</Header>
                <Header>Unclaimed Eras</Header>
                <Header>Total Claimable</Header>
              </ItemHeaders>
              <InputComponent
                inputSize="l"
                validation={canAfford ? undefined : 'invalid'}
                message={isReady ? (canAfford ? '' : 'Insufficient balance to cover fee.') : ''}
              >
                <List>
                  {validatorsRewards.map((validator: ValidatorClaimableRewards) => (
                    <StyledListItem
                      key={validator.address}
                      onClick={() => setSelectedAccount(validator.account)}
                      $isSelected={selectedAccount?.address === validator.address}
                    >
                      <AccountColumn>
                        <TextMedium bold>{validator.account?.name || 'Unknown'}</TextMedium>
                        <TextSmall lighter>{validator.address}</TextSmall>
                      </AccountColumn>
                      <CenterColumn>
                        <TextMedium>{validator.unclaimedEras.length}</TextMedium>
                      </CenterColumn>
                      <RightColumn>
                        <TokenValue value={validator.totalClaimable} />
                      </RightColumn>
                    </StyledListItem>
                  ))}
                </List>
              </InputComponent>
            </RowGapBlock>
          </RowGapBlock>
        </ModalBody>
        <ModalTransactionFooter
          transactionFee={paymentInfo?.partialFee}
          next={{
            onClick: () => sign(),
            label: 'Sign transaction and claim',
            disabled: !isReady || !canAfford || !selectedAccount,
          }}
        />
      </Modal>
    )
  }

  return null
}

const ItemHeaders = styled.div`
  display: grid;
  grid-template-rows: 1fr;
  grid-template-columns: 2fr 1fr 1fr;
  justify-content: space-between;
  width: 100%;
  padding: 0 16px;
  gap: 8px;
`

const Header = styled.div`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.black[400]};

  &:nth-child(2) {
    text-align: center;
  }

  &:last-child {
    text-align: right;
  }
`

const StyledListItem = styled(ListItem)<{ $isSelected?: boolean }>`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  cursor: pointer;
  background-color: ${({ $isSelected, theme }) => ($isSelected ? theme.colors.blue[50] : 'transparent')};
  border: 1px solid ${({ $isSelected, theme }) => ($isSelected ? theme.colors.blue[500] : theme.colors.black[100])};
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background-color: ${({ theme }) => theme.colors.blue[50]};
  }
`

const AccountColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const CenterColumn = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`

const RightColumn = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
`

const TextSmall = styled.span<{ lighter?: boolean }>`
  font-size: 12px;
  color: ${({ lighter, theme }) => (lighter ? theme.colors.black[400] : theme.colors.black[900])};
  overflow: hidden;
  text-overflow: ellipsis;
`
