import React, { useState } from 'react'
import styled from 'styled-components'

import { ContentWithTabs } from '@/common/components/page/PageContent'
import { Tabs } from '@/common/components/Tabs'

import { Nominators } from './Nominators'
import { Overview } from './OverView'
import { RewardHistory } from './RewardHistory'
import { SlashingHistory } from './SlashingHistory'

type ValidatorDashboardTab = 'overview' | 'nominators' | 'rewards' | 'slashing'

export function ValidatorDashboardMain() {
  const [activeTab, setActiveTab] = useState<ValidatorDashboardTab>('overview')

  const tabs = [
    {
      title: 'Overview',
      active: activeTab === 'overview',
      onClick: () => setActiveTab('overview'),
    },
    {
      title: 'Nominators',
      active: activeTab === 'nominators',
      onClick: () => setActiveTab('nominators'),
    },
    {
      title: 'Rewards History',
      active: activeTab === 'rewards',
      onClick: () => setActiveTab('rewards'),
    },
    {
      title: 'Slashing History',
      active: activeTab === 'slashing',
      onClick: () => setActiveTab('slashing'),
    },
  ]

  return (
    <ContentWithTabs>
      <Tabs tabs={tabs} />
      <ValidatorDashboardWrap>
        {activeTab === 'overview' && <Overview />}
        {activeTab === 'nominators' && <Nominators />}
        {activeTab === 'rewards' && <RewardHistory />}
        {activeTab === 'slashing' && <SlashingHistory />}
      </ValidatorDashboardWrap>
    </ContentWithTabs>
  )
}

const ValidatorDashboardWrap = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 16px auto;
  grid-template-areas:
    'accountstablenav'
    'accountslist';
  grid-row-gap: 4px;
  width: 100%;
`
