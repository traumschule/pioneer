import React from 'react'

import { ButtonPrimary } from '@/common/components/buttons'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/common/components/Modal'
import { TextMedium, TokenValue } from '@/common/components/typography'
import { useModal } from '@/common/hooks/useModal'
import { encodeAddress } from '@/accounts/model/encodeAddress'

import { UnbondStakingModalCall } from '.'

export const UnbondStakingModal = () => {
  const { hideModal, modalData } = useModal<UnbondStakingModalCall>()

  if (!modalData) {
    return null
  }

  return (
    <Modal modalSize="s" modalHeight="s" onClose={hideModal}>
      <ModalHeader title="Unbond stake" onClick={hideModal} />
      <ModalBody>
        <TextMedium>
          Unbonding directly from Pioneer is not yet supported. To unbond the bonded amount of{' '}
          <TokenValue value={modalData.bonded} /> for stash <strong>{encodeAddress(modalData.stash)}</strong>, please use
          polkadot.js apps.
        </TextMedium>
      </ModalBody>
      <ModalFooter>
        <ButtonPrimary size="medium" onClick={hideModal}>
          Close
        </ButtonPrimary>
      </ModalFooter>
    </Modal>
  )
}


