import React from 'react'

import { ButtonPrimary } from '@/common/components/buttons'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/common/components/Modal'
import { TextMedium } from '@/common/components/typography'
import { useModal } from '@/common/hooks/useModal'
import { encodeAddress } from '@/accounts/model/encodeAddress'

import { StopStakingModalCall } from '.'

export const StopStakingModal = () => {
  const { hideModal, modalData } = useModal<StopStakingModalCall>()

  if (!modalData) {
    return null
  }

  const roleLabel = modalData.role === 'validator' ? 'validator' : 'nominator'

  return (
    <Modal modalSize="s" modalHeight="s" onClose={hideModal}>
      <ModalHeader title="Stop staking" onClick={hideModal} />
      <ModalBody>
        <TextMedium>
          To stop participating as a {roleLabel}, please use polkadot.js apps for stash{' '}
          <strong>{encodeAddress(modalData.stash)}</strong>. This action is not yet supported in the application.
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


