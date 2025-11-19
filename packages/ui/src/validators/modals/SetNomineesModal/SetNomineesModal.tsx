import React, { useEffect, useMemo, useState } from 'react'

import { useMyAccounts } from '@/accounts/hooks/useMyAccounts'
import { encodeAddress } from '@/accounts/model/encodeAddress'
import { useApi } from '@/api/hooks/useApi'
import { ButtonSecondary } from '@/common/components/buttons'
import { FailureModal } from '@/common/components/FailureModal'
import { InputComponent, InputText } from '@/common/components/forms'
import { Modal, ModalBody, ModalHeader, ModalTransactionFooter } from '@/common/components/Modal'
import { RowGapBlock } from '@/common/components/page/PageContent'
import { SuccessModal } from '@/common/components/SuccessModal'
import { TextMedium, TextSmall } from '@/common/components/typography'
import { useMachine } from '@/common/hooks/useMachine'
import { useModal } from '@/common/hooks/useModal'
import { useSignAndSendTransaction } from '@/common/hooks/useSignAndSendTransaction'
import { transactionMachine } from '@/common/model/machines'
import { useMyMemberships } from '@/memberships/hooks/useMyMemberships'
import { useStakingQueries, useStakingTransactions } from '@/validators/hooks/useStakingSDK'

import { SetNomineesModalCall } from '.'

export const SetNomineesModal = () => {
  const { modalData } = useModal<SetNomineesModalCall>()

  if (!modalData) {
    return null
  }

  return <SetNomineesModalInner stash={modalData.stash} currentNominations={modalData.nominations} />
}

interface SetNomineesModalInnerProps {
  stash: string
  currentNominations: string[]
}

const SetNomineesModalInner = ({ stash, currentNominations }: SetNomineesModalInnerProps) => {
  const { hideModal } = useModal<SetNomineesModalCall>()
  const { api } = useApi()
  const { allAccounts } = useMyAccounts()
  const { active: activeMembership } = useMyMemberships()
  const { nominate } = useStakingTransactions()
  const { getValidators } = useStakingQueries()
  const [state, , service] = useMachine(transactionMachine)

  const [selectedValidators, setSelectedValidators] = useState<string[]>(currentNominations)
  const [availableValidators, setAvailableValidators] = useState<Array<{ account: string; commission?: number }>>([])
  const [validatorSearch, setValidatorSearch] = useState('')
  const [isLoadingValidators, setIsLoadingValidators] = useState(true)

  useEffect(() => {
    const loadValidators = async () => {
      try {
        const validators = await getValidators()
        setAvailableValidators(validators || [])
      } catch {
        setAvailableValidators([])
      } finally {
        setIsLoadingValidators(false)
      }
    }

    loadValidators()
  }, [])

  const filteredValidators = useMemo(() => {
    if (!validatorSearch.trim()) return availableValidators
    const searchLower = validatorSearch.toLowerCase()
    return availableValidators.filter(
      (v) =>
        v.account.toLowerCase().includes(searchLower) || encodeAddress(v.account).toLowerCase().includes(searchLower)
    )
  }, [availableValidators, validatorSearch])

  const transaction = useMemo(() => {
    if (!api) return undefined
    // Allow empty array to clear nominations
    return nominate(selectedValidators)
  }, [api, nominate, selectedValidators])

  // Use active membership controller account, or fallback to stash account
  const signerAccount = useMemo(() => {
    if (activeMembership?.controllerAccount) {
      return allAccounts.find((acc) => acc.address === activeMembership.controllerAccount) || allAccounts[0]
    }
    return allAccounts.find((acc) => acc.address === stash) || allAccounts[0]
  }, [activeMembership, allAccounts, stash])

  const { isReady, sign, paymentInfo, canAfford } = useSignAndSendTransaction({
    transaction,
    signer: signerAccount?.address ?? '',
    service: service as any,
    skipQueryNode: true,
  })

  const handleValidatorToggle = (validatorAddress: string) => {
    setSelectedValidators((prev) => {
      if (prev.includes(validatorAddress)) {
        return prev.filter((addr) => addr !== validatorAddress)
      } else {
        if (prev.length >= 16) {
          // Max 16 nominations
          return prev
        }
        return [...prev, validatorAddress]
      }
    })
  }

  if (state.matches('canceled')) {
    return (
      <Modal onClose={hideModal} modalSize="m" modalHeight="m">
        <ModalHeader title="Transaction Canceled" onClick={hideModal} />
        <ModalBody>
          <TextMedium>
            The transaction was canceled. Please try again if you want to update your nominations.
          </TextMedium>
        </ModalBody>
        <ModalTransactionFooter next={{ onClick: hideModal, label: 'Close' }} />
      </Modal>
    )
  }

  if (state.matches('error')) {
    return (
      <FailureModal onClose={hideModal} events={state.context.events}>
        There was a problem with updating nominations
      </FailureModal>
    )
  }

  if (state.matches('success')) {
    return (
      <SuccessModal
        onClose={hideModal}
        text={`You have successfully updated your nominations. You are now nominating ${
          selectedValidators.length
        } validator${selectedValidators.length === 1 ? '' : 's'}.`}
      />
    )
  }

  const signDisabled = !isReady || !canAfford || isLoadingValidators

  return (
    <Modal modalSize="l" modalHeight="l" onClose={hideModal}>
      <ModalHeader title="Set Nominees" onClick={hideModal} />
      <ModalBody>
        <RowGapBlock gap={16}>
          <TextMedium>
            Select validators to nominate for stash <strong>{encodeAddress(stash)}</strong>. You can nominate up to 16{' '}
            validators.
          </TextMedium>

          <InputComponent label="Search Validators" inputSize="l" id="validator-search">
            <InputText
              id="validator-search"
              placeholder="Search by address..."
              value={validatorSearch}
              onChange={(e) => setValidatorSearch(e.target.value)}
            />
          </InputComponent>

          <div>
            <TextMedium>
              <strong>Selected Validators:</strong> {selectedValidators.length} / 16
            </TextMedium>
            {selectedValidators.length >= 16 && (
              <TextSmall style={{ color: 'orange' }}>
                Maximum number of nominations reached. Remove a validator to add another.
              </TextSmall>
            )}
          </div>

          <div
            style={{
              maxHeight: '400px',
              overflowY: 'auto',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '8px',
            }}
          >
            {isLoadingValidators ? (
              <TextMedium>Loading validators...</TextMedium>
            ) : filteredValidators.length === 0 ? (
              <TextMedium>No validators found.</TextMedium>
            ) : (
              filteredValidators.map((validator) => {
                const isSelected = selectedValidators.includes(validator.account)
                return (
                  <div
                    key={validator.account}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      border: isSelected ? '2px solid #4CAF50' : '1px solid #ddd',
                      margin: '4px 0',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#f0f8f0' : 'white',
                    }}
                    onClick={() => handleValidatorToggle(validator.account)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleValidatorToggle(validator.account)}
                      disabled={!isSelected && selectedValidators.length >= 16}
                      style={{ marginRight: '12px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <TextMedium>{encodeAddress(validator.account)}</TextMedium>
                      {validator.commission !== undefined && <TextSmall>Commission: {validator.commission}%</TextSmall>}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {!canAfford && paymentInfo?.partialFee && (
            <TextSmall style={{ color: 'red' }}>
              <strong>Error:</strong> Insufficient funds to cover transaction costs
            </TextSmall>
          )}

          <TextSmall>
            <strong>Note:</strong> Your nominations will take effect in the next era. You can change nominations at any{' '}
            time without unbonding.
          </TextSmall>
        </RowGapBlock>
      </ModalBody>
      <ModalTransactionFooter
        transactionFee={paymentInfo?.partialFee?.toBn()}
        next={{
          disabled: signDisabled,
          label: 'Update Nominations',
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
