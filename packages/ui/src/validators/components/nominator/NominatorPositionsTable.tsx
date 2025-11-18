import BN from 'bn.js'
import React, { useMemo, useState } from 'react'
import styled from 'styled-components'

import { Account } from '@/accounts/types'
import { List, ListItem } from '@/common/components/List'
import { Tabs } from '@/common/components/Tabs'
import { Colors } from '@/common/constants'
import { MyStakingRole, MyStashPosition } from '@/validators/hooks/useMyStashPositions'
import { ValidatorWithDetails } from '@/validators/types/Validator'

import { NorminatorDashboardItem } from './NominatorItems'

type FilterKey = 'all' | MyStakingRole

export interface Props {
  positions: MyStashPosition[]
  accountsMap: Map<string, Account>
  validatorsMap: Map<string, ValidatorWithDetails>
  totalStake: BN
  totalClaimable: BN
  className?: string
  showFilter?: boolean
  tabsSize?: React.ComponentProps<typeof Tabs>['tabsSize']
}

const hasNonZeroStake = (position: MyStashPosition) => {
  if (!position.totalStake.isZero() || !position.activeStake.isZero()) {
    return true
  }

  return position.unlocking.some((chunk) => !chunk.value.isZero())
}

export const NominatorPositionsTable = ({
  positions,
  accountsMap,
  validatorsMap,
  totalStake,
  totalClaimable,
  className,
  showFilter = true,
  tabsSize = 'xs',
}: Props) => {
  const positionsWithStake = useMemo(() => positions.filter((position) => hasNonZeroStake(position)), [positions])

  const [filter, setFilter] = useState<FilterKey>('all')

  const counts = useMemo(() => {
    return positionsWithStake.reduce(
      (acc, position) => {
        acc.all += 1
        acc[position.role] += 1
        return acc
      },
      {
        all: 0,
        validator: 0,
        nominator: 0,
        inactive: 0,
      } as Record<FilterKey, number>
    )
  }, [positionsWithStake])

  const filteredPositions = useMemo(() => {
    if (filter === 'all') {
      return positionsWithStake
    }
    return positionsWithStake.filter((position) => position.role === filter)
  }, [positionsWithStake, filter])

  const filterTabs = useMemo(
    () =>
      [
        {
          title: 'All Stashes',
          key: 'all' as FilterKey,
          count: counts.all,
        },
        {
          title: 'Nominators',
          key: 'nominator' as FilterKey,
          count: counts.nominator,
        },
        {
          title: 'Validators',
          key: 'validator' as FilterKey,
          count: counts.validator,
        },
        {
          title: 'Inactive',
          key: 'inactive' as FilterKey,
          count: counts.inactive,
        },
      ].map(({ title, key, count }) => ({
        title,
        count,
        active: filter === key,
        onClick: () => setFilter(key),
      })),
    [counts, filter]
  )

  return (
    <Wrapper className={className}>
      {showFilter && (
        <TabsContainer>
          <Tabs tabs={filterTabs} tabsSize={tabsSize} />
        </TabsContainer>
      )}
      <ListHeaders>
        <ListHeader>Account</ListHeader>
        <ListHeader>Role</ListHeader>
        <ListHeader>Active Stake</ListHeader>
        <ListHeader>Total Stake</ListHeader>
        <ListHeader>Unlocking</ListHeader>
        <ListHeader>Nominations</ListHeader>
        <ListHeader>Claimable Reward</ListHeader>
        <ListHeader>Primary Action</ListHeader>
        <ListHeader />
        <ListHeader />
      </ListHeaders>
      <StyledList>
        {filteredPositions.map((position) => (
          <ListItem key={position.stash} borderless>
            <NorminatorDashboardItem
              account={accountsMap.get(position.stash)}
              position={position}
              validatorDetails={validatorsMap.get(position.stash)}
              totalStaked={totalStake}
              totalClaimable={totalClaimable}
            />
          </ListItem>
        ))}
      </StyledList>
    </Wrapper>
  )
}

const Wrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto 16px auto;
  grid-template-areas:
    'validatorstablenav'
    'validatorstableheaders'
    'validatorslist';
  grid-row-gap: 4px;
  width: 100%;
`

const TabsContainer = styled.div`
  grid-area: validatorstablenav;
`

const StyledList = styled(List)`
  grid-area: validatorslist;
`

const ListHeaders = styled.div`
  display: grid;
  grid-area: validatorstableheaders;
  grid-template-rows: 1fr;
  grid-template-columns: 280px 100px 120px 120px 120px 140px 140px 140px 40px 40px;
  justify-content: space-between;
  justify-items: center;
  width: 100%;
  padding: 0 8px;
`

const ListHeader = styled.span`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  align-content: center;
  justify-self: start;
  width: fit-content;
  font-size: 10px;
  line-height: 16px;
  font-weight: 700;
  color: ${Colors.Black[400]};
  text-transform: uppercase;
  text-align: right;
  user-select: none;

  &:first-child {
    text-align: left;
    justify-self: start;
  }
`
