import BN from 'bn.js'
import React, { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'

import { AccountInfo } from '@/accounts/components/AccountInfo'
import { Account } from '@/accounts/types'
import { ButtonGhost, ButtonPrimary } from '@/common/components/buttons'
import { TransactionButtonWrapper } from '@/common/components/buttons/TransactionButton'
import { EditSymbol } from '@/common/components/icons/symbols'
import { DeleteSymbol } from '@/common/components/icons/symbols/DeleteSymbol'
import { TableListItemAsLinkHover } from '@/common/components/List'
import { TextMedium, TextSmall, TokenValue } from '@/common/components/typography'
import { BorderRad, Colors, Sizes, Transitions, BN_ZERO, ZIndex } from '@/common/constants'
import { useModal } from '@/common/hooks/useModal'
import { useOutsideClick } from '@/common/hooks/useOutsideClick'
import { shortenAddress } from '@/common/model/formatters'
import { MyStashPosition } from '@/validators/hooks/useMyStashPositions'
import { ManageStashAction, ManageStashActionModalCall } from '@/validators/modals/ManageStashActionModal'
import { SetNomineesModalCall } from '@/validators/modals/SetNomineesModal'
import { StopStakingModalCall } from '@/validators/modals/StopStakingModal'
import { UnbondStakingModalCall } from '@/validators/modals/UnbondStakingModal'
import { ValidatorWithDetails } from '@/validators/types/Validator'

interface Props {
  account?: Account
  position: MyStashPosition
  validatorDetails?: ValidatorWithDetails
  totalStaked: BN
  totalClaimable: BN
}

export const NorminatorDashboardItem = ({
  account,
  position,
  validatorDetails,
  totalStaked,
  totalClaimable,
}: Props) => {
  const { showModal } = useModal()
  const [isMenuOpen, setMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useOutsideClick(menuRef, isMenuOpen, () => {
    setMenuOpen(false)
    setMenuPosition(null)
  })

  const accountInfo = useMemo<Account>(() => {
    if (account) {
      return account
    }

    return {
      address: position.stash,
      name: shortenAddress(position.stash),
      source: 'external',
    }
  }, [account, position.stash])

  const roleLabel = useMemo(() => {
    switch (position.role) {
      case 'validator':
        return 'Validator'
      case 'nominator':
        return 'Nominator'
      default:
        return 'Inactive'
    }
  }, [position.role])

  const roleVariant = useMemo(() => {
    switch (position.role) {
      case 'validator':
        return 'success'
      case 'nominator':
        return 'info'
      default:
        return 'neutral'
    }
  }, [position.role])

  const assignmentsCount = useMemo(() => {
    if (position.role === 'validator') {
      return validatorDetails?.staking?.nominators.length ?? 0
    }
    return position.nominations.length
  }, [position.role, validatorDetails?.staking?.nominators, position.nominations])

  const assignmentsLabel = position.role === 'validator' ? 'nominators' : 'nominations'

  const unlockingTotal = useMemo(
    () => position.unlocking.reduce((sum, chunk) => sum.add(chunk.value), new BN(0)),
    [position.unlocking]
  )

  const claimableReward = useMemo(() => {
    if (totalClaimable.isZero() || totalStaked.isZero() || position.activeStake.isZero()) {
      return BN_ZERO
    }

    return totalClaimable.mul(position.activeStake).div(totalStaked)
  }, [position.activeStake, totalClaimable, totalStaked])

  const canStop = position.role !== 'inactive'
  const canUnbond = position.role === 'inactive' && (!position.totalStake.isZero() || !unlockingTotal.isZero())

  const openManageActionModal = (action: ManageStashAction) =>
    showModal<ManageStashActionModalCall>({
      modal: 'ManageStashActionModal',
      data: {
        stash: position.stash,
        controller: position.controller,
        action,
        activeStake: position.activeStake,
        totalStake: position.totalStake,
        unlocking: position.unlocking,
      },
    })

  const openSetNomineesModal = () =>
    showModal<SetNomineesModalCall>({
      modal: 'SetNomineesModal',
      data: {
        stash: position.stash,
        nominations: position.nominations,
      },
    })

  const openStopStakingModal = () =>
    showModal<StopStakingModalCall>({
      modal: 'StopStakingModal',
      data: {
        stash: position.stash,
        role: position.role,
      },
    })

  const openUnbondModal = () =>
    showModal<UnbondStakingModalCall>({
      modal: 'UnbondStakingModal',
      data: {
        stash: position.stash,
        controller: position.controller,
        bonded: position.totalStake,
      },
    })

  const menuItems: Array<{
    label: string
    onClick: () => void
    disabled?: boolean
  }> = [
    {
      label: 'Bond more / Rebond after unbonding',
      onClick: () => openManageActionModal('bondRebond'),
      disabled: !position.controller,
    },
    {
      label: 'Withdraw funds after unbonding period',
      onClick: () => openManageActionModal('withdraw'),
      disabled: !position.controller || unlockingTotal.isZero(),
    },
    {
      label: 'Change controller account',
      onClick: () => openManageActionModal('changeController'),
    },
    {
      label: 'Change reward destination',
      onClick: () => openManageActionModal('changeReward'),
    },
  ]

  if (position.role === 'nominator') {
    menuItems.push({
      label: 'Set nominees',
      onClick: openSetNomineesModal,
    })
  }

  const primaryAction = position.role === 'nominator' ? openSetNomineesModal : () => openManageActionModal('bondRebond')
  const primaryLabel = position.role === 'nominator' ? 'Set nominees' : 'Manage stake'

  return (
    <ValidatorItemWrapper>
      <ValidatorItemWrap>
        <AccountCell>
          <AccountInfo account={accountInfo} />
        </AccountCell>

        <RoleCell>
          <RoleBadge role={roleVariant}>{roleLabel}</RoleBadge>
        </RoleCell>

        <TokenValue value={position.activeStake} />
        <TokenValue value={position.totalStake} />
        <TokenValue value={unlockingTotal} />

        <AssignmentsCell>
          <TextMedium>{assignmentsCount}</TextMedium>
          <TextSmall lighter>{assignmentsLabel}</TextSmall>
        </AssignmentsCell>

        <TokenValue value={claimableReward} />

        <ButtonPrimary size="small" onClick={primaryAction}>
          {primaryLabel}
        </ButtonPrimary>

        <TransactionButtonWrapper>
          <MenuContainer ref={menuRef}>
            <ButtonForTransfer
              size="small"
              square
              onClick={(event) => {
                event.stopPropagation()
                if (!isMenuOpen && menuRef.current) {
                  const rect = menuRef.current.getBoundingClientRect()
                  const menuHeight = 200 // Approximate menu height
                  const spaceBelow = window.innerHeight - rect.bottom
                  const spaceAbove = rect.top
                  
                  let top: number
                  if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
                    // Position above if not enough space below
                    top = rect.top - menuHeight - 8
                  } else {
                    // Position below
                    top = rect.bottom + 8
                  }
                  
                  setMenuPosition({
                    top,
                    right: window.innerWidth - rect.right,
                  })
                } else {
                  setMenuPosition(null)
                }
                setMenuOpen((prev) => !prev)
              }}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
            >
              <EditSymbol />
            </ButtonForTransfer>
            {isMenuOpen &&
              menuPosition &&
              createPortal(
                <MenuDropdown role="menu" style={{ top: `${menuPosition.top}px`, right: `${menuPosition.right}px` }}>
                  {menuItems.map(({ label, disabled, onClick }) => (
                    <MenuItem
                      key={label}
                      disabled={disabled}
                      onClick={() => {
                        if (disabled) return
                        setMenuOpen(false)
                        setMenuPosition(null)
                        onClick()
                      }}
                    >
                      {label}
                    </MenuItem>
                  ))}
                </MenuDropdown>,
                document.body
              )}
          </MenuContainer>
        </TransactionButtonWrapper>

        {canStop ? (
          <ButtonGhost size="small" onClick={openStopStakingModal} disabled={!position.controller}>
            Stop
          </ButtonGhost>
        ) : (
          <TransactionButtonWrapper>
            <ButtonForTransfer
              size="small"
              square
              disabled={!canUnbond}
              onClick={() => {
                if (!canUnbond) return
                openUnbondModal()
              }}
            >
              <DeleteSymbol />
            </ButtonForTransfer>
          </TransactionButtonWrapper>
        )}
      </ValidatorItemWrap>
    </ValidatorItemWrapper>
  )
}

const ValidatorItemWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid ${Colors.Black[100]};
  border-radius: ${BorderRad.s};
  transition: ${Transitions.all};
  ${TableListItemAsLinkHover}
`

export const ValidatorItemWrap = styled.div`
  display: grid;
  grid-template-columns: 280px 100px 120px 120px 120px 140px 140px 140px 40px 86px;
  grid-template-rows: 1fr;
  justify-content: space-between;
  justify-items: start;
  align-items: center;
  width: 100%;
  min-height: ${Sizes.accountHeight};
  padding: 16px 8px 16px 16px;
  margin-left: -1px;
  gap: 16px;
`

const AccountCell = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
`

const RoleCell = styled.div`
  display: flex;
  align-items: center;
`

const AssignmentsCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const ButtonForTransfer = styled(ButtonGhost)`
  position: relative;
  z-index: 1;
  svg {
    color: ${Colors.Black[900]};
  }
`

const MenuDropdown = styled.div`
  position: fixed;
  display: grid;
  gap: 8px;
  min-width: 240px;
  padding: 16px 20px;
  background-color: ${Colors.White};
  border: 1px solid ${Colors.Black[100]};
  border-radius: ${BorderRad.m};
  box-shadow: 0 12px 24px rgba(17, 17, 17, 0.12);
  z-index: ${ZIndex.dropdown};
`

const MenuItem = styled.button<{ disabled?: boolean }>`
  display: flex;
  width: 100%;
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  text-align: left;
  color: ${({ disabled }) => (disabled ? Colors.Black[300] : Colors.Black[900])};
  background: transparent;
  border: none;
  padding: 0;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};

  &:hover,
  &:focus {
    color: ${({ disabled }) => (disabled ? Colors.Black[300] : Colors.Blue[500])};
  }
`

const MenuContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`

type RoleVariant = 'success' | 'info' | 'neutral'

const RoleBadge = styled.span<{ role: RoleVariant }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  border-radius: ${BorderRad.full};
  font-size: 12px;
  line-height: 16px;
  font-weight: 700;
  text-transform: uppercase;
  background-color: ${({ role }) => {
    switch (role) {
      case 'success':
        return Colors.Green[100]
      case 'info':
        return Colors.Blue[100]
      default:
        return Colors.Black[100]
    }
  }};
  color: ${({ role }) => {
    switch (role) {
      case 'success':
        return Colors.Green[500]
      case 'info':
        return Colors.Blue[600]
      default:
        return Colors.Black[600]
    }
  }};
`
