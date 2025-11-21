import React, { useEffect, useMemo, useState } from 'react'
import { catchError, first, map, of } from 'rxjs'

import { SelectAccount } from '@/accounts/components/SelectAccount'
import { useMyAccounts } from '@/accounts/hooks/useMyAccounts'
import { useStakingAccountsLocks } from '@/accounts/hooks/useStakingAccountsLocks'
import { useApi } from '@/api/hooks/useApi'
import { ButtonSecondary } from '@/common/components/buttons'
import { FailureModal } from '@/common/components/FailureModal'
import { InputComponent, InputText } from '@/common/components/forms'
import { Modal, ModalBody, ModalHeader, ModalTransactionFooter } from '@/common/components/Modal'
import { RowGapBlock } from '@/common/components/page/PageContent'
import { FilterTextSelect } from '@/common/components/selects'
import { SuccessModal } from '@/common/components/SuccessModal'
import { TextMedium, TextSmall } from '@/common/components/typography'
import { BN_ZERO } from '@/common/constants'
import { useMachine } from '@/common/hooks/useMachine'
import { useModal } from '@/common/hooks/useModal'
import { useObservable } from '@/common/hooks/useObservable'
import { useSignAndSendTransaction } from '@/common/hooks/useSignAndSendTransaction'
import { transactionMachine } from '@/common/model/machines'
import { useMyMemberships } from '@/memberships/hooks/useMyMemberships'
import { useStakingTransactions } from '@/validators/hooks/useStakingSDK'
import { BondModalCall } from '@/validators/modals/BondModal/types'

export const BondModal = () => {
  const { hideModal } = useModal<BondModalCall>()
  const { api } = useApi()
  const { allAccounts } = useMyAccounts()
  const { active: activeMembership } = useMyMemberships()
  const { bond } = useStakingTransactions()
  const [state, , service] = useMachine(transactionMachine)

  const [amount, setAmount] = useState('')
  const [stash, setStash] = useState('')
  const [controller, setController] = useState('')
  const [payee, setPayee] = useState('Stash')
  const [controllerError, setControllerError] = useState<string | null>(null)

  const joyToBalance = (joy: string): bigint => {
    const joyAmount = parseFloat(joy)
    return BigInt(Math.floor(joyAmount * 10_000_000_000))
  }

  // Initialize stash with first account or active membership account
  useEffect(() => {
    if (!stash && allAccounts.length > 0) {
      if (activeMembership?.boundAccounts && activeMembership.boundAccounts.length > 0) {
        // Prefer accounts bound to membership
        const boundAccount = allAccounts.find((acc) => activeMembership.boundAccounts?.includes(acc.address))
        if (boundAccount) {
          setStash(boundAccount.address)
          return
        }
      }
      // Fallback to first account
      setStash(allAccounts[0].address)
    }
  }, [stash, allAccounts, activeMembership])

  // When stash changes and controller is empty, set controller to stash initially
  useEffect(() => {
    if (stash && !controller) {
      setController(stash)
    }
  }, [stash, controller])

  // Check if controller is already used
  const controllerBonded = useObservable(() => {
    if (!api || !controller) return of(undefined)
    return api.query.staking.bonded(controller).pipe(
      map((bonded) => {
        if (bonded.isNone) return null
        return bonded.unwrap().toString()
      }),
      first(),
      catchError(() => of(null))
    )
  }, [api?.isConnected, controller])

  useEffect(() => {
    if (controller && controllerBonded !== undefined) {
      if (controllerBonded && controllerBonded !== stash) {
        setControllerError('This account is already used as a controller for another stash')
      } else {
        setControllerError(null)
      }
    }
  }, [controller, controllerBonded, stash])

  // Get accounts with locks to filter restricted accounts
  const accountsWithLocks = useStakingAccountsLocks({
    requiredStake: BN_ZERO,
    lockType: 'Staking',
    filterByBalance: false,
  })

  const transaction = useMemo(() => {
    if (!api || !amount || parseFloat(amount) <= 0 || !controller || !stash) return undefined
    return bond(controller, joyToBalance(amount), payee)
  }, [api, amount, controller, payee, stash, bond])

  // The signer should be the stash account (the account that holds the funds being bonded)
  const signerAccount = useMemo(() => {
    if (!stash) return allAccounts[0]
    return allAccounts.find((acc) => acc.address === stash) || allAccounts[0]
  }, [stash, allAccounts])

  const { isReady, sign, paymentInfo, canAfford } = useSignAndSendTransaction({
    transaction,
    signer: signerAccount?.address ?? '',
    service: service as any,
    skipQueryNode: true,
  })

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
      setAmount(value)
    }
  }

  if (state.matches('canceled')) {
    return (
      <Modal onClose={hideModal} modalSize="m" modalHeight="m">
        <ModalHeader title="Transaction Canceled" onClick={hideModal} />
        <ModalBody>
          <TextMedium>The transaction was canceled. Please try again if you want to bond tokens.</TextMedium>
        </ModalBody>
        <ModalTransactionFooter next={{ onClick: hideModal, label: 'Close' }} />
      </Modal>
    )
  }

  if (state.matches('error')) {
    return (
      <FailureModal onClose={hideModal} events={state.context.events}>
        There was a problem with bonding your tokens
      </FailureModal>
    )
  }

  if (state.matches('success')) {
    return (
      <SuccessModal
        onClose={hideModal}
        text={`Bond transaction submitted successfully! You have bonded ${amount} JOY tokens.`}
      />
    )
  }

  const signDisabled =
    !isReady || !canAfford || !amount || parseFloat(amount) <= 0 || !controller || !stash || !!controllerError

  return (
    <Modal modalSize="m" modalHeight="m" onClose={hideModal}>
      <ModalHeader title="Bond Tokens" onClick={hideModal} />
      <ModalBody>
        <RowGapBlock gap={16}>
          <TextMedium>Bond your tokens for staking. Bonded tokens are locked and can earn rewards.</TextMedium>

          <InputComponent label="Stash Account" required inputSize="l" id="stash-account">
            <SelectAccount
              onChange={(account) => {
                setStash(account?.address || '')
                // Reset controller if stash changes
                if (account?.address && controller === stash) {
                  setController(account.address)
                }
              }}
              selected={allAccounts.find((acc) => acc.address === stash)}
              placeholder="Select stash account"
              filter={(account) => {
                const accountWithLocks = accountsWithLocks.find((acc) => acc.address === account.address)
                // Filter out accounts with rivalrous locks (Councilor/Worker stake)
                return !accountWithLocks?.optionLocks?.includes('rivalrousLock')
              }}
            />
          </InputComponent>
          {stash &&
            (() => {
              const stashAccount = accountsWithLocks.find((acc) => acc.address === stash)
              if (stashAccount?.optionLocks?.includes('rivalrousLock')) {
                return (
                  <TextSmall style={{ color: 'orange' }}>
                    <strong>Warning:</strong> This account has external restrictions (Councilor/Worker stake) that may
                    conflict with staking.
                  </TextSmall>
                )
              }
              return null
            })()}

          <InputComponent label="Amount to Bond (JOY)" required inputSize="m" id="bond-amount">
            <InputText
              id="bond-amount"
              placeholder="Enter amount to bond"
              value={amount}
              onChange={handleAmountChange}
              type="number"
              step="0.1"
              min="0"
            />
          </InputComponent>

          <InputComponent label="Controller Account" required inputSize="l" id="controller-account">
            <SelectAccount
              onChange={(account) => setController(account?.address || '')}
              selected={allAccounts.find((acc) => acc.address === controller)}
              placeholder="Select controller account"
            />
          </InputComponent>

          {controllerError && (
            <TextSmall style={{ color: 'red' }}>
              <strong>Error:</strong> {controllerError}
            </TextSmall>
          )}

          <TextSmall>
            <strong>Note:</strong> The controller account manages nominations and other staking operations. It can be
            the same as the stash account, but cannot be used as a controller for another stash.
          </TextSmall>

          <FilterTextSelect
            options={['Stash', 'Controller', 'Account']}
            value={payee}
            onChange={(value) => setPayee(value || 'Stash')}
            selectSize="l"
          />

          {!canAfford && paymentInfo?.partialFee && (
            <TextSmall style={{ color: 'red' }}>
              <strong>Error:</strong> Insufficient funds to cover transaction costs
            </TextSmall>
          )}

          <TextSmall>
            <strong>Note:</strong> This transaction will bond your tokens to the staking system. Bonded tokens are{' '}
            locked and cannot be transferred until unbonded.
          </TextSmall>
        </RowGapBlock>
      </ModalBody>
      <ModalTransactionFooter
        transactionFee={paymentInfo?.partialFee?.toBn()}
        next={{
          disabled: signDisabled,
          label: 'Bond Tokens',
          onClick: sign,
        }}
      >
        <ButtonSecondary size="medium" onClick={hideModal}>
          Cancel
        </ButtonSecondary>
      </ModalTransactionFooter>
    </Modal>
  )
}
