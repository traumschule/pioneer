import React from 'react'

import { ButtonPrimary } from '@/common/components/buttons'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/common/components/Modal'
import { TextMedium } from '@/common/components/typography'
import { useModal } from '@/common/hooks/useModal'
import { encodeAddress } from '@/accounts/model/encodeAddress'

import { SetNomineesModalCall } from '.'

export const SetNomineesModal = () => {
  const { hideModal, modalData } = useModal<SetNomineesModalCall>()

  if (!modalData) {
    return null
  }

  return (
    <Modal modalSize="m" modalHeight="s" onClose={hideModal}>
      <ModalHeader title="Set nominees" onClick={hideModal} />
      <ModalBody>
        <TextMedium>
          Managing nominees for stash <strong>{encodeAddress(modalData.stash)}</strong> is not yet available in this
          build. You currently have {modalData.nominations.length} nominated validator
          {modalData.nominations.length === 1 ? '' : 's'}.
        </TextMedium>
        <TextMedium>
          Please use polkadot.js apps to set or update nominees until this flow is fully implemented.
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


