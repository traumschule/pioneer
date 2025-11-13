import React from 'react'

import { encodeAddress } from '@/accounts/model/encodeAddress'
import { ButtonPrimary } from '@/common/components/buttons'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/common/components/Modal'
import { TextMedium } from '@/common/components/typography'
import { useModal } from '@/common/hooks/useModal'

import { ManageStashActionModalCall } from '.'

const TITLES: Record<ManageStashActionModalCall['data']['action'], string> = {
  bondRebond: 'Bond more / Rebond',
  withdraw: 'Withdraw unbonded funds',
  changeController: 'Change controller account',
  changeReward: 'Change reward destination',
}

export const ManageStashActionModal = () => {
  const { hideModal, modalData } = useModal<ManageStashActionModalCall>()

  if (!modalData) {
    return null
  }

  const title = TITLES[modalData.action]

  return (
    <Modal modalSize="s" modalHeight="s" onClose={hideModal}>
      <ModalHeader title={title} onClick={hideModal} />
      <ModalBody>
        <TextMedium>
          This action is not yet available in the interface for stash <strong>{encodeAddress(modalData.stash)}</strong>. Please use the
          CLI or polkadot.js apps to perform this staking operation.
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


