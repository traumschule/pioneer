import React, { useMemo, useState } from 'react'

import { useMyAccounts } from '@/accounts/hooks/useMyAccounts'
import { encodeAddress } from '@/accounts/model/encodeAddress'
import { useApi } from '@/api/hooks/useApi'
import { ButtonSecondary } from '@/common/components/buttons'
import { FailureModal } from '@/common/components/FailureModal'
import { InputComponent, InputText, InputTextarea } from '@/common/components/forms'
import { Modal, ModalBody, ModalHeader, ModalTransactionFooter } from '@/common/components/Modal'
import { RowGapBlock } from '@/common/components/page/PageContent'
import { SuccessModal } from '@/common/components/SuccessModal'
import { TextMedium, TextSmall } from '@/common/components/typography'
import { useMachine } from '@/common/hooks/useMachine'
import { useModal } from '@/common/hooks/useModal'
import { useSignAndSendTransaction } from '@/common/hooks/useSignAndSendTransaction'
import { transactionMachine } from '@/common/model/machines'
import { useMyMemberships } from '@/memberships/hooks/useMyMemberships'

import { ChangeSessionKeysModalCall } from '.'

export const ChangeSessionKeysModal = () => {
  const { modalData } = useModal<ChangeSessionKeysModalCall>()

  if (!modalData) {
    return null
  }

  return <ChangeSessionKeysModalInner stash={modalData.stash} controller={modalData.controller} />
}

interface ChangeSessionKeysModalInnerProps {
  stash: string
  controller?: string
}

const ChangeSessionKeysModalInner = ({ stash, controller }: ChangeSessionKeysModalInnerProps) => {
  const { hideModal } = useModal<ChangeSessionKeysModalCall>()
  const { api } = useApi()
  const { allAccounts } = useMyAccounts()
  const { active: activeMembership } = useMyMemberships()
  const [state, , service] = useMachine(transactionMachine)

  const [keys, setKeys] = useState('')
  const [proof, setProof] = useState('')

  const transaction = useMemo(() => {
    if (!api || !keys) return undefined

    try {
      let keysArray: string[]
      try {
        keysArray = JSON.parse(keys)
      } catch {
        keysArray = keys
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean)
      }

      if (keysArray.length === 0) return undefined

      if (keysArray.length < 4) {
        return undefined
      }

      const sessionKeys = {
        grandpa: keysArray[0],
        babe: keysArray[1],
        imOnline: keysArray[2],
        authorityDiscovery: keysArray[3],
      }

      const proofBytes = proof || '0x'

      return api.tx.session.setKeys(sessionKeys, proofBytes)
    } catch (error) {
      return undefined
    }
  }, [api, keys, proof])

  const signerAccount = useMemo(() => {
    if (controller) {
      return allAccounts.find((acc) => acc.address === controller) || allAccounts[0]
    }
    if (activeMembership?.controllerAccount) {
      return allAccounts.find((acc) => acc.address === activeMembership.controllerAccount) || allAccounts[0]
    }
    return allAccounts[0]
  }, [activeMembership, allAccounts, controller])

  const { isReady, sign, paymentInfo, canAfford } = useSignAndSendTransaction({
    transaction,
    signer: signerAccount?.address ?? '',
    service: service as any,
    skipQueryNode: true,
  })

  if (state.matches('canceled')) {
    return (
      <Modal onClose={hideModal} modalSize="m" modalHeight="m">
        <ModalHeader title="Transaction Canceled" onClick={hideModal} />
        <ModalBody>
          <TextMedium>The transaction was canceled. Please try again if you want to change session keys.</TextMedium>
        </ModalBody>
        <ModalTransactionFooter next={{ onClick: hideModal, label: 'Close' }} />
      </Modal>
    )
  }

  if (state.matches('error')) {
    return (
      <FailureModal onClose={hideModal} events={state.context.events}>
        There was a problem with changing session keys
      </FailureModal>
    )
  }

  if (state.matches('success')) {
    return <SuccessModal onClose={hideModal} text="You have successfully changed your session keys" />
  }

  const signDisabled = !isReady || !canAfford || !keys || keys.trim().length === 0

  return (
    <Modal modalSize="m" modalHeight="m" onClose={hideModal}>
      <ModalHeader title="Change Session Keys" onClick={hideModal} />
      <ModalBody>
        <RowGapBlock gap={16}>
          <TextMedium>
            Change session keys for validator stash <strong>{encodeAddress(stash)}</strong>.
          </TextMedium>

          <TextSmall>
            <strong>Note:</strong> Session keys are used by validators to participate in consensus. Changing session
            keys requires providing the new keys and a proof. The keys should be provided as a JSON array or
            comma-separated values: [grandpa, babe, im_online, authority_discovery]
          </TextSmall>

          <InputComponent label="Session Keys" required inputSize="l" id="session-keys">
            <InputTextarea
              id="session-keys"
              placeholder='["5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", ...] or comma-separated'
              value={keys}
              onChange={(e) => setKeys(e.target.value)}
              style={{ minHeight: '100px', resize: 'vertical' }}
            />
          </InputComponent>

          <InputComponent label="Proof (optional)" inputSize="l" id="session-proof">
            <InputText
              id="session-proof"
              placeholder="0x..."
              value={proof}
              onChange={(e) => setProof(e.target.value)}
            />
          </InputComponent>

          {!canAfford && paymentInfo?.partialFee && (
            <TextSmall style={{ color: 'red' }}>
              <strong>Error:</strong> Insufficient funds to cover transaction costs
            </TextSmall>
          )}

          <TextSmall>
            <strong>Warning:</strong> Changing session keys incorrectly can cause your validator to be slashed. Make
            sure you understand the implications before proceeding.
          </TextSmall>
        </RowGapBlock>
      </ModalBody>
      <ModalTransactionFooter
        transactionFee={paymentInfo?.partialFee?.toBn()}
        next={{
          disabled: signDisabled,
          label: 'Change Session Keys',
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
