import BN from 'bn.js'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { combineLatest, first, map, of } from 'rxjs'
import styled from 'styled-components'

import { AccountInfo } from '@/accounts/components/AccountInfo'
import { useMyAccounts } from '@/accounts/hooks/useMyAccounts'
import { encodeAddress } from '@/accounts/model/encodeAddress'
import { Account } from '@/accounts/types'
import { useApi } from '@/api/hooks/useApi'
import { ButtonGhost } from '@/common/components/buttons'
import { TransactionButtonWrapper } from '@/common/components/buttons/TransactionButton'
import { EditSymbol } from '@/common/components/icons/symbols'
import { DeleteSymbol } from '@/common/components/icons/symbols/DeleteSymbol'
import { LockSymbol } from '@/common/components/icons/symbols/LockSymbol'
import { WatchIcon } from '@/common/components/icons/WatchIcon'
import { TableListItemAsLinkHover } from '@/common/components/List'
import { Tooltip, TooltipPopupTitle, TooltipText } from '@/common/components/Tooltip'
import { TextMedium, TextSmall, TokenValue } from '@/common/components/typography'
import {
  BorderRad,
  Colors,
  Sizes,
  Transitions,
  BN_ZERO,
  ERAS_PER_DAY,
  ZIndex,
  JOY_DECIMAL_PLACES,
} from '@/common/constants'
import { useModal } from '@/common/hooks/useModal'
import { useObservable } from '@/common/hooks/useObservable'
import { error } from '@/common/logger'
import { shortenAddress } from '@/common/model/formatters'
import { MyStashPosition } from '@/validators/hooks/useMyStashPositions'
import { ChangeSessionKeysModalCall } from '@/validators/modals/ChangeSessionKeysModal'
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
  const { allAccounts } = useMyAccounts()
  const [isMenuOpen, setMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const menuDropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const clickedOutsideMenu = menuRef.current && !menuRef.current.contains(target)
      const clickedOutsideDropdown = menuDropdownRef.current && !menuDropdownRef.current.contains(target)

      if (clickedOutsideMenu && clickedOutsideDropdown) {
        setMenuOpen(false)
        setMenuPosition(null)
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [isMenuOpen])

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

  const controllerAccountInfo = useMemo<Account | null>(() => {
    if (!position.controller) return null
    // Find controller account if it exists in allAccounts
    const controllerAccount = allAccounts?.find((acc) => acc.address === position.controller)
    if (controllerAccount) {
      return controllerAccount
    }
    return {
      address: position.controller,
      name: shortenAddress(position.controller),
      source: 'external',
    }
  }, [position.controller])

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

  const { api } = useApi()

  const currentEra = useObservable(() => {
    if (!api) return of(undefined)
    return api.query.staking.activeEra().pipe(
      map((activeEra) => {
        if (activeEra.isNone) return undefined
        return activeEra.unwrap().index.toNumber()
      })
      // Remove first() to allow continuous updates for countdown
    )
  }, [api?.isConnected])

  // Force re-render every minute to update countdown display
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!currentEra) return
    const interval = setInterval(() => {
      // Trigger re-render to update countdown display
      setTick((t) => t + 1)
    }, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [currentEra])

  const activeValidators = useObservable(() => {
    if (!api) return of([] as string[])
    return api.query.session.validators().pipe(
      map((validators) => validators.map((v) => v.toString())),
      first()
    )
  }, [api?.isConnected])

  interface NominationInfo {
    address: string
    isActive: boolean
    stake?: BN
  }

  const nominationsInfo = useObservable<NominationInfo[]>(() => {
    if (!api || position.role !== 'nominator' || !position.nominations.length || !currentEra) {
      return of([])
    }

    const activeValidatorsSet = new Set(activeValidators || [])

    const exposureQueries = position.nominations
      .filter((nom) => activeValidatorsSet.has(nom))
      .map((nom) =>
        api.query.staking.erasStakers(currentEra, nom).pipe(
          map((exposure) => {
            if (!exposure || exposure.isEmpty) return { address: nom, isActive: true, stake: BN_ZERO }
            const stash = position.stash
            const nominatorExposure = exposure.others.find((other) => other.who.toString() === stash)
            return {
              address: nom,
              isActive: true,
              stake: nominatorExposure ? nominatorExposure.value.toBn() : BN_ZERO,
            }
          }),
          first()
        )
      )

    const inactiveNominations: NominationInfo[] = position.nominations
      .filter((nom) => !activeValidatorsSet.has(nom))
      .map((nom) => ({ address: nom, isActive: false }))

    if (exposureQueries.length === 0) {
      return of(inactiveNominations)
    }

    return combineLatest(exposureQueries).pipe(
      map((activeInfos) => [...activeInfos, ...inactiveNominations]),
      first()
    )
  }, [api?.isConnected, currentEra, activeValidators, position.nominations, position.role, position.stash])

  const activeNominationsCount = useMemo(() => {
    if (position.role === 'validator') return assignmentsCount
    if (!activeValidators || !position.nominations.length) return 0
    const activeSet = new Set(activeValidators)
    return position.nominations.filter((nom) => activeSet.has(nom)).length
  }, [position.role, position.nominations, activeValidators, assignmentsCount])

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

  const rewardDestination = useObservable(() => {
    if (!api || !position.controller) return of(undefined)
    return api.query.staking.payee(position.controller).pipe(
      map((payee) => {
        if (payee.isStaked) return 'Staked'
        if (payee.isStash) return 'Stash'
        if (payee.isController) return 'Controller'
        if (payee.isAccount) return 'Account'
        return 'Staked'
      }),
      first()
    )
  }, [api?.isConnected, position.controller])

  const UNBONDING_PERIOD_ERAS = 112

  const getUnbondingTimeInfo = useMemo(() => {
    if (!currentEra || !position.unlocking.length) {
      return { hasUnbonding: false, remainingEras: 0, isRecoverable: false }
    }

    const earliestChunk = position.unlocking.reduce((earliest, chunk) => {
      if (!earliest || chunk.era < earliest.era) return chunk
      return earliest
    }, position.unlocking[0])

    const remainingEras = UNBONDING_PERIOD_ERAS - (currentEra - earliestChunk.era)
    const isRecoverable = remainingEras === 0 && earliestChunk.era + UNBONDING_PERIOD_ERAS <= currentEra

    return {
      hasUnbonding: true,
      remainingEras,
      earliestEra: earliestChunk.era,
      isRecoverable,
    }
  }, [currentEra, position.unlocking])

  const BLOCKS_PER_ERA = 3600
  const remainingBlocks = useMemo(() => {
    if (!getUnbondingTimeInfo.hasUnbonding || getUnbondingTimeInfo.isRecoverable) return null
    return new BN(getUnbondingTimeInfo.remainingEras * BLOCKS_PER_ERA)
  }, [getUnbondingTimeInfo])

  const unbondingTooltipText = useMemo(() => {
    if (!getUnbondingTimeInfo.hasUnbonding) return null
    if (getUnbondingTimeInfo.isRecoverable) {
      return (
        <UnbondingTooltipContent>
          <TooltipText>Recoverable</TooltipText>
        </UnbondingTooltipContent>
      )
    }

    const { remainingEras } = getUnbondingTimeInfo
    const remainingDays = Math.floor(remainingEras / ERAS_PER_DAY)
    const remainingHours = Math.floor((remainingEras % ERAS_PER_DAY) * 6)
    const blocks = remainingBlocks || BN_ZERO

    let timeText = ''
    if (remainingDays > 0) {
      timeText = `${remainingDays} day${remainingDays > 1 ? 's' : ''} ${remainingHours} hr${
        remainingHours !== 1 ? 's' : ''
      }`
    } else {
      timeText = `${remainingHours} hr${remainingHours !== 1 ? 's' : ''}`
    }

    return (
      <UnbondingTooltipContent>
        <TooltipText>
          {blocks.toString()} blocks ({timeText})
        </TooltipText>
      </UnbondingTooltipContent>
    )
  }, [getUnbondingTimeInfo, remainingBlocks])

  const openChangeControllerModal = () => {
    showModal<ManageStashActionModalCall>({
      modal: 'ManageStashActionModal',
      data: {
        stash: position.stash,
        controller: position.controller,
        action: 'changeController',
        activeStake: position.activeStake,
        totalStake: position.totalStake,
        unlocking: position.unlocking,
      },
    })
  }

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

  if (position.role === 'validator') {
    menuItems.push({
      label: 'Change session keys',
      onClick: () =>
        showModal<ChangeSessionKeysModalCall>({
          modal: 'ChangeSessionKeysModal',
          data: {
            stash: position.stash,
            controller: position.controller,
          },
        }),
      disabled: !position.controller,
    })
  }

  return (
    <ValidatorItemWrapper>
      <ValidatorItemWrap>
        <RoleCell>
          <RoleBadge role={roleVariant}>{roleLabel}</RoleBadge>
        </RoleCell>

        <AccountCell>
          <AccountInfo account={accountInfo} />
        </AccountCell>

        <ControllerCell>
          {controllerAccountInfo ? (
            <>
              <AccountInfo account={controllerAccountInfo} />
              <ButtonForTransfer
                size="small"
                square
                onClick={(e) => {
                  e.stopPropagation()
                  openChangeControllerModal()
                }}
              >
                <EditSymbol />
              </ButtonForTransfer>
            </>
          ) : (
            <TextSmall lighter>-</TextSmall>
          )}
        </ControllerCell>

        <RewardsCell>
          <TextSmall>{rewardDestination || '-'}</TextSmall>
        </RewardsCell>

        <StakeCell>
          <StakeInfo>
            <StakeRow>
              <TokenValue value={position.activeStake} />
            </StakeRow>
            {unlockingTotal.gt(BN_ZERO) && getUnbondingTimeInfo.hasUnbonding && (
              <StakeRow>
                {getUnbondingTimeInfo.isRecoverable && (
                  <RecoverableButton
                    size="small"
                    square
                    onClick={(e) => {
                      e.stopPropagation()
                      openManageActionModal('withdraw')
                    }}
                    title="Recoverable - click to withdraw"
                  >
                    <LockSymbol />
                  </RecoverableButton>
                )}
                {!getUnbondingTimeInfo.isRecoverable && unbondingTooltipText && (
                  <Tooltip popupContent={unbondingTooltipText}>
                    <UnbondingIcon>
                      <TextSmall lighter><TokenValue value={unlockingTotal} /> unbonding</TextSmall>
                    </UnbondingIcon>
                  </Tooltip>
                )}
              </StakeRow>
            )}
          </StakeInfo>
        </StakeCell>

        <AssignmentsCell>
          {position.role === 'nominator' && position.nominations.length > 0 ? (
            <Tooltip
              popupContent={
                <NominationsTooltipContent>
                  {nominationsInfo === undefined ? (
                    <TextSmall lighter>Loading...</TextSmall>
                  ) : nominationsInfo && nominationsInfo.length > 0 ? (
                    <>
                      {nominationsInfo.some((n) => n.isActive) && (
                        <>
                          <TooltipSection>
                            <TooltipPopupTitle>
                              Active ({nominationsInfo.filter((n) => n.isActive).length})
                            </TooltipPopupTitle>
                            {nominationsInfo
                              .filter((n) => n.isActive)
                              .map((nom) =>
                                    <TooltipRow key={nom.address}>
                                      <TooltipText>{shortenAddress(encodeAddress(nom.address), 20)}</TooltipText>
                                      {nom.stake && (
                                        <TokenValue mjoy value={nom.stake} />
                                      )}
                                    </TooltipRow>
                              )}
                          </TooltipSection>
                          {nominationsInfo.some((n) => !n.isActive) && <TooltipDivider />}
                        </>
                      )}
                      {nominationsInfo.some((n) => !n.isActive) && (
                        <TooltipSection>
                          <TooltipPopupTitle>
                            Inactive ({nominationsInfo.filter((n) => !n.isActive).length})
                          </TooltipPopupTitle>
                          {nominationsInfo
                            .filter((n) => !n.isActive)
                            .map((nom) => (
                              <TooltipRow key={nom.address}>
                                <TooltipText>{shortenAddress(encodeAddress(nom.address), 20)}</TooltipText>
                              </TooltipRow>
                            ))}
                        </TooltipSection>
                      )}
                    </>
                  ) : (
                    <TextSmall lighter>No nominations info available</TextSmall>
                  )}
                </NominationsTooltipContent>
              }
            >
              <NominationsIndicator>
                {nominationsInfo === undefined ? (
                  <TextSmall lighter>Loading...</TextSmall>
                ) : (
                  <TextMedium>
                    {activeNominationsCount} / {position.nominations.length}
                  </TextMedium>
                )}
                <ButtonForTransfer
                  size="small"
                  square
                  onClick={(e) => {
                    e.stopPropagation()
                    openSetNomineesModal()
                  }}
                >
                  <EditSymbol />
                </ButtonForTransfer>
              </NominationsIndicator>
            </Tooltip>
          ) : (
            <>
              <TextMedium>{assignmentsCount}</TextMedium>
              <TextSmall lighter>{assignmentsLabel}</TextSmall>
            </>
          )}
        </AssignmentsCell>

        <TokenValue value={claimableReward} />

        <TransactionButtonWrapper>
          <MenuContainer ref={menuRef}>
            <ButtonForTransfer
              size="small"
              square
              onClick={(event) => {
                event.stopPropagation()
                if (!isMenuOpen && menuRef.current) {
                  const rect = menuRef.current.getBoundingClientRect()
                  const menuHeight = 200
                  const spaceBelow = window.innerHeight - rect.bottom
                  const spaceAbove = rect.top

                  let top: number
                  if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
                    top = rect.top - menuHeight - 8
                  } else {
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
                <MenuDropdown
                  ref={menuDropdownRef}
                  role="menu"
                  style={{ top: `${menuPosition.top}px`, right: `${menuPosition.right}px` }}
                >
                  {menuItems.map(({ label, disabled, onClick }) => (
                    <MenuItem
                      key={label}
                      disabled={disabled}
                      onClick={(event) => {
                        if (disabled) return
                        event.stopPropagation()
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
          </MenuContainer>
        </TransactionButtonWrapper>
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
  grid-template-columns: 100px 210px 240px 120px 180px 140px 140px 40px 40px 40px;
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

const ControllerCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
`

const RewardsCell = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
`

const StakeCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  gap: 4px;
`

const StakeInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
`

const StakeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const UnbondingIcon = styled.div`
  display: flex;
  align-items: center;
  cursor: help;
  color: ${Colors.Black[600]};
  svg {
    width: 16px;
    height: 16px;
  }
  &:hover {
    color: ${Colors.Black[900]};
  }
`

const RecoverableButton = styled(ButtonGhost)`
  padding: 4px;
  svg {
    color: ${Colors.Blue[500]};
  }
`

const NominationsIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const NominationsTooltipContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 300px;
`

const TooltipSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`

const TooltipRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;

  &:last-child {
    margin-bottom: 0;
  }
`

const TooltipDivider = styled.div`
  height: 1px;
  background-color: ${Colors.Black[500]};
  margin: 8px 0;
`

const UnbondingTooltipContent = styled.div`
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
  gap: 0;
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
