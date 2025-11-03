import React, { ReactNode, useMemo, useState } from 'react'
import styled from 'styled-components'

import { AccountItemLoading } from '@/accounts/components/AccountItem/AccountItemLoading'
import { useMyAccounts } from '@/accounts/hooks/useMyAccounts'
import { useMyBalances } from '@/accounts/hooks/useMyBalances'
import { filterAccounts } from '@/accounts/model/filterAccounts'
import { SortKey, setOrder, sortAccounts } from '@/accounts/model/sortAccounts'
import { ButtonPrimary } from '@/common/components/buttons'
import MultilineChart, { MultilineChartData } from '@/common/components/charts/MultiLineChart'
import { EmptyPagePlaceholder } from '@/common/components/EmptyPagePlaceholder/EmptyPagePlaceholder'
import { List, ListItem } from '@/common/components/List'
import { ContentWithTabs } from '@/common/components/page/PageContent'
import { FilterTextSelect } from '@/common/components/selects'
import { HeaderText, SortIconDown, SortIconUp } from '@/common/components/SortedListHeaders'
import { Colors } from '@/common/constants'
import { useModal } from '@/common/hooks/useModal'
import { ChartTimeRange, useMyStakingChartData } from '@/validators/hooks/useMyStakingChartData'

import { ValidatorAccountItem } from './dashboard/ValidatorAccountItem'

export function Overview() {
  const { allAccounts, hasAccounts, isLoading, wallet } = useMyAccounts()
  const { showModal } = useModal()
  const [isDisplayAll] = useState(true)
  const balances = useMyBalances()
  const [sortBy, setSortBy] = useState<SortKey>('name')
  const [isDescending, setDescending] = useState(false)
  const [chartTimeRange, setChartTimeRange] = useState<ChartTimeRange>('month')
  const visibleAccounts = useMemo(
    () => filterAccounts(allAccounts, isDisplayAll, balances),
    [JSON.stringify(allAccounts), isDisplayAll, hasAccounts]
  )
  const sortedAccounts = useMemo(
    () => sortAccounts(visibleAccounts, balances, sortBy, isDescending),
    [visibleAccounts, balances, sortBy, isDescending]
  )

  const chartData = useMyStakingChartData(chartTimeRange)

  const getOnSort = (key: SortKey) => () => setOrder(key, sortBy, setSortBy, isDescending, setDescending)

  const Header = ({ children, sortKey }: HeaderProps) => {
    return (
      <ListHeader onClick={getOnSort(sortKey)}>
        <HeaderText>
          {children}
          {sortBy === sortKey && (isDescending ? <SortIconDown /> : <SortIconUp />)}
        </HeaderText>
      </ListHeader>
    )
  }

  if (!hasAccounts && !isLoading) {
    return (
      <EmptyPagePlaceholder
        title="Connect your wallet or create an account"
        copy="A Polkadot wallet is required to see a breakdown of all your connected wallet account balances."
        button={
          <ButtonPrimary size="large" onClick={() => showModal({ modal: 'OnBoardingModal' })}>
            {!wallet ? 'Connect Wallet' : 'Join Now'}
          </ButtonPrimary>
        }
      />
    )
  }

  const filterOptions: { label: string; value: ChartTimeRange }[] = [
    { label: 'Last Month', value: 'month' },
    { label: 'Last Week', value: 'week' },
    { label: 'Last Day', value: 'day' },
  ]

  const defaultChartData: MultilineChartData = {
    labels: [],
    barData: [],
    rewardData: [],
    stakeData: [],
  }

  return (
    <ContentWithTabs>
      <ChartWarp>
        <ChartHeader>
          <HeaderText>VALIDATOR PERFORMANCE</HeaderText>
          <FilterBox>
            <FilterTextSelect
              options={filterOptions.map((opt) => opt.label)}
              value={filterOptions.find((opt) => opt.value === chartTimeRange)?.label || filterOptions[0].label}
              onChange={(value) => {
                const selected = filterOptions.find((opt) => opt.label === value)
                if (selected) setChartTimeRange(selected.value)
              }}
            />
          </FilterBox>
        </ChartHeader>
        <MultilineChart data={chartData || defaultChartData} />
      </ChartWarp>
      <AccountsWrap>
        <ListHeaders>
          <Header sortKey="name">ACCOUNT</Header>
          <Header sortKey="total">TOTAL EARNED</Header>
          <Header sortKey="recoverable">CLAIMABLE</Header>
        </ListHeaders>
        <List>
          {!isLoading ? (
            sortedAccounts.map((account) => (
              <ListItem key={account.address}>
                <ValidatorAccountItem account={account} />
              </ListItem>
            ))
          ) : (
            <AccountItemLoading count={5} />
          )}
        </List>
      </AccountsWrap>
    </ContentWithTabs>
  )
}

interface HeaderProps {
  children: ReactNode
  sortKey: SortKey
}
const ChartWarp = styled.div`
  padding-bottom: 20px;
`
const FilterBox = styled.div`
  display: flex;
  justify-content: flex-end;
  * {
    width: 200px;
  }
`

const ChartHeader = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-column-gap: 8px;
  justify-content: space-between;
  gap: 8px;
`

const AccountsWrap = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 16px auto;
  grid-template-areas:
    'accountstablenav'
    'accountslist';
  grid-row-gap: 4px;
  width: 100%;

  ${List} {
    gap: 8px;
  }
  ${ListItem} {
    background: ${Colors.Black[50]};
  }
`

const ListHeaders = styled.div`
  display: grid;
  grid-area: accountstablenav;
  grid-template-rows: 1fr;
  grid-template-columns: 276px repeat(2, 128px) 104px;
  justify-content: space-between;
  width: 100%;
  padding: 0 16px;
`

export const ListHeader = styled.span`
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
  cursor: pointer;

  &:first-child {
    text-align: left;
    justify-self: start;
  }
`
