import { Meta, Story } from '@storybook/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

import { asBlock } from '@/common/types'

import { randomMarkdown } from '../../../../dev/scripts/generators/utils'
import { getMember } from '../../../../test/_mocks/members'

import { ProposalList, ProposalListProps } from '.'

export default {
  title: 'Proposals/ProposalList',
  component: ProposalList,
} as Meta

const Template: Story<ProposalListProps> = (args) => (
  <MemoryRouter>
    <ProposalList {...args} />
  </MemoryRouter>
)

export const Default = Template.bind({})
Default.args = {
  proposals: [
    {
      createdAt: '2021-06-11T16:26:04.129Z',
      details: 'setWorkingGroupLeadReward',
      id: '0',
      proposer: getMember('alice'),
      status: 'deciding',
      title: 'firewall Stand-alone set Checking',
      rationale: randomMarkdown(),
      statusSetAtBlock: asBlock(),
    },
    {
      createdAt: '2021-05-31T03:15:57.037Z',
      details: 'editBlogPost',
      id: '1',
      proposer: getMember('bob'),
      status: 'deciding',
      title: 'Computer Directives grey Clothing',
      rationale: randomMarkdown(),
      statusSetAtBlock: asBlock(),
    },
  ],
}

export const Past = Template.bind({})
Past.args = {
  proposals: [
    {
      createdAt: '2021-06-11T16:26:04.129Z',
      endedAt: '2021-06-11T16:26:04.129Z',
      details: 'setWorkingGroupLeadReward',
      id: '0',
      proposer: getMember('alice'),
      status: 'slashed',
      title: 'firewall Stand-alone set Checking',
      rationale: randomMarkdown(),
      statusSetAtBlock: asBlock(),
    },
    {
      createdAt: '2021-05-31T03:15:57.037Z',
      endedAt: '2021-06-11T16:26:04.129Z',
      details: 'editBlogPost',
      id: '1',
      proposer: getMember('bob'),
      status: 'vetoed',
      title: 'Computer Directives grey Clothing',
      rationale: randomMarkdown(),
      statusSetAtBlock: asBlock(),
    },
  ],
}
