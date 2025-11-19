import React, { useState } from 'react'
import styled from 'styled-components'

import { ContentWithTabs } from '@/common/components/page/PageContent'
import { Tabs } from '@/common/components/Tabs'
import { TextMedium } from '@/common/components/typography'
import { Colors } from '@/common/constants'

import { Nominators } from './Nominators'
import { Overview } from './OverView'

type ValidatorDashboardTab = 'overview' | 'nominators' | 'slashes'

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
      title: 'Slashes',
      active: activeTab === 'slashes',
      onClick: () => setActiveTab('slashes'),
    },
  ]

  return (
    <ContentWithTabs>
      <Tabs tabs={tabs} />
      <ValidatorDashboardWrap>
        {activeTab === 'overview' && <Overview />}
        {activeTab === 'nominators' && <Nominators />}
        {activeTab === 'slashes' && (
          <NotImplementedWrapper>
            <TextMedium lighter>Slashes tab is not yet implemented.</TextMedium>
          </NotImplementedWrapper>
        )}
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

const NotImplementedWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 48px;
  color: ${Colors.Black[400]};
`
