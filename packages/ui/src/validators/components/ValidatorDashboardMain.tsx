import React, { useState } from 'react'
import styled from 'styled-components'

import { ContentWithTabs } from '@/common/components/page/PageContent'
import { Tabs } from '@/common/components/Tabs'

import { Nominators } from './Nominators'
import { Overview } from './OverView'

type ValidatorDashboardTab = 'overview' | 'nominators'

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
  ]

  return (
    <ContentWithTabs>
      <Tabs tabs={tabs} />
      <ValidatorDashboardWrap>
        {activeTab === 'overview' && <Overview />}
        {activeTab === 'nominators' && <Nominators />}
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
