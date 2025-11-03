import React from 'react'
import styled from 'styled-components'

import { PageHeader } from '@/app/components/PageHeader'
import { PageLayout } from '@/app/components/PageLayout'
import { List, ListItem } from '@/common/components/List'
import { RowGapBlock } from '@/common/components/page/PageContent'
import { MultiTextValueStat, MultiValueStat, Statistics, TokenValueStat } from '@/common/components/statistics'
import { BN_ZERO, Colors } from '@/common/constants'
import { NorminatorDashboardItem } from '@/validators/components/nominator/NominatorItems'
import { useMyStakingAPR } from '@/validators/hooks/useMyStakingAPR'
import { useMyStakingInfo } from '@/validators/hooks/useMyStakingInfo'
import { useMyStakingRewards } from '@/validators/hooks/useMyStakingRewards'
import { useValidatorsList } from '@/validators/hooks/useValidatorsList'

import { ClaimAllButton } from './components/ClaimAllButton'
import { ValidatorsTabs } from './components/ValidatorsTabs'

export const NominatorDashboard = () => {
  const { validatorsWithDetails } = useValidatorsList()
  const stakingInfo = useMyStakingInfo()
  const stakingRewards = useMyStakingRewards()
  const stakingAPR = useMyStakingAPR()

  return (
    <PageLayout
      header={
        <RowGapBlock gap={24}>
          <PageHeader title="Validators" tabs={<ValidatorsTabs />} />
          <Statistics>
            <TokenValueStat
              title="CLAIMABLE REWARDS"
              tooltipText="Total staking rewards that can be claimed from all your nominator accounts. These are rewards earned but not yet claimed from past eras."
              tooltipTitle="Claimable Staking Rewards"
              tooltipLinkText="Learn about claiming rewards"
              tooltipLinkURL="#"
              value={stakingRewards?.claimableRewards}
              actionElement={<ClaimAllButton />}
            />
            <MultiValueStat
              title="STAKE"
              tooltipText="Your total nominated stake across all validators you're nominating."
              tooltipTitle="Nominator Stake"
              tooltipLinkText="Learn about nominating"
              tooltipLinkURL="#"
              values={[
                { label: 'Total', value: stakingInfo?.totalStake ?? BN_ZERO },
                { label: 'Yours', value: stakingInfo?.ownStake ?? BN_ZERO },
              ]}
            />
            <MultiValueStat
              title="YOUR REWARDS "
              tooltipText="Total rewards earned from nominating validators and the rewards from the most recent era."
              tooltipTitle="Nominator Rewards"
              tooltipLinkText="Learn about nominator rewards"
              tooltipLinkURL="#"
              values={[
                { label: 'total', value: stakingRewards?.totalRewards ?? BN_ZERO },
                { label: 'last', value: stakingRewards?.lastEraRewards ?? BN_ZERO },
              ]}
            />
            <MultiTextValueStat
              title="ANNUAL PECENTAGE RATE(APR)"
              tooltipText="Expected annual percentage return based on your nominated validators' performance. Average is calculated from the last 30 eras (~7.5 days)."
              tooltipTitle="Nominator APR"
              tooltipLinkText="Learn about APR calculation"
              tooltipLinkURL="#"
              values={[
                { label: 'Average', value: `${stakingAPR?.averageAPR?.toFixed(2) ?? '0.00'}%` },
                { label: 'Last 7 days', value: `${stakingAPR?.last7DaysAPR?.toFixed(2) ?? '0.00'}%` },
              ]}
            />
          </Statistics>
        </RowGapBlock>
      }
      main={
        <ValidatorsListWrap>
          <ListHeaders>
            <ListHeader>Validator</ListHeader>
            <ListHeader>Total Reward</ListHeader>
            <ListHeader>Health</ListHeader>
            <ListHeader>Apr</ListHeader>
            <ListHeader>7Days Apr</ListHeader>
            <ListHeader>Slashed</ListHeader>
            <ListHeader>Your stake</ListHeader>
            <ListHeader>Claimable Reward</ListHeader>
          </ListHeaders>
          <List>
            {validatorsWithDetails?.map((validator) => (
              <ListItem key={validator.stashAccount} borderless>
                <NorminatorDashboardItem validator={validator} />
              </ListItem>
            ))}
          </List>
        </ValidatorsListWrap>
      }
    />
  )
}

const ValidatorsListWrap = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 16px auto;
  grid-template-areas:
    'validatorstablenav'
    'validatorslist';
  grid-row-gap: 4px;
  width: 100%;
`

const ListHeaders = styled.div`
  display: grid;
  grid-area: validatorstablenav;
  grid-template-rows: 1fr;
  grid-template-columns: 222px 141px 75px 30px 73px 55px 131px 120px 118px 30px 27px;
  justify-content: space-between;
  justify-items: center;
  width: 100%;
  padding-left: 9px;
  padding-right: 8px;
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
