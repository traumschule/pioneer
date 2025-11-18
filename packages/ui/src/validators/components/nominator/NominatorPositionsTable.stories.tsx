import { Meta, Story } from '@storybook/react'
import BN from 'bn.js'
import React from 'react'

import { MockApolloProvider } from '@/mocks/components/storybook/MockApolloProvider'
import { NominatorPositionsTable, Props } from '@/validators/components/nominator/NominatorPositionsTable'
import { MyStashPosition } from '@/validators/hooks/useMyStashPositions'
import { ValidatorWithDetails } from '@/validators/types/Validator'

export default {
  title: 'Validators/NominatorPositionsTable',
  component: NominatorPositionsTable,
} as Meta

const Template: Story<Props> = (args) => (
  <MockApolloProvider members>
    <div style={{ padding: '20px', width: '1000px' }}>
      <NominatorPositionsTable {...args} />
    </div>
  </MockApolloProvider>
)

const createMockAccount = (address: string, name: string) => ({
  address,
  name,
  source: 'polkadot-js' as const,
})

const createMockPosition = (overrides?: Partial<MyStashPosition>): MyStashPosition => ({
  stash: 'j4VdDQVdwFYfQ2MvEdLT2EYZx4ALPQQ6yMyZopKoZEQmXcJrT',
  controller: 'j4VdDQVdwFYfQ2MvEdLT2EYZx4ALPQQ6yMyZopKoZEQmXcJrT',
  totalStake: new BN('100000000000000'), // 100000 JOY
  activeStake: new BN('100000000000000'),
  unlocking: [],
  claimedRewards: [],
  nominations: [],
  validatorPrefsSet: false,
  role: 'nominator',
  ...overrides,
})

const createMockValidator = (address: string): ValidatorWithDetails => ({
  stashAccount: address,
  controllerAccount: address,
  commission: 5,
  isActive: true,
  APR: 12.5,
  staking: {
    total: new BN('100000000000000'),
    own: new BN('10000000000000'),
    nominators: [],
  },
  membership: {
    id: '0',
    handle: 'validator_alice',
    name: 'Alice Validator',
  } as any,
})

export const SingleNominator = Template.bind({})
SingleNominator.args = {
  positions: [createMockPosition()],
  accountsMap: new Map([
    [
      'j4VdDQVdwFYfQ2MvEdLT2EYZx4ALPQQ6yMyZopKoZEQmXcJrT',
      createMockAccount('j4VdDQVdwFYfQ2MvEdLT2EYZx4ALPQQ6yMyZopKoZEQmXcJrT', 'Nominator 1'),
    ],
  ]),
  validatorsMap: new Map(),
  totalStake: new BN('100000000000000'),
  totalClaimable: new BN('5000000000000'),
  showFilter: true,
}

export const MultiplePositions = Template.bind({})
MultiplePositions.args = {
  positions: [
    createMockPosition({
      stash: 'j4VdDQVdwFYfQ2MvEdLT2EYZx4ALPQQ6yMyZopKoZEQmXcJrT',
      role: 'nominator',
      nominations: ['j4W7rVcUCxi2crhhjRq46fNDRbVHTjJrz6bKxZwehEMQxZeSf'],
    }),
    createMockPosition({
      stash: 'j4W7rVcUCxi2crhhjRq46fNDRbVHTjJrz6bKxZwehEMQxZeSf',
      role: 'validator',
      validatorPrefsSet: true,
      totalStake: new BN('200000000000000'),
      activeStake: new BN('200000000000000'),
    }),
    createMockPosition({
      stash: 'j4RLnWh3DWgc9u3Y5qZ6z7XK8Y9Z0A1B2C3D4E5F6G7H8I9J0',
      role: 'inactive',
      totalStake: new BN('50000000000000'),
      activeStake: new BN('0'),
    }),
  ],
  accountsMap: new Map([
    [
      'j4VdDQVdwFYfQ2MvEdLT2EYZx4ALPQQ6yMyZopKoZEQmXcJrT',
      createMockAccount('j4VdDQVdwFYfQ2MvEdLT2EYZx4ALPQQ6yMyZopKoZEQmXcJrT', 'Nominator 1'),
    ],
    [
      'j4W7rVcUCxi2crhhjRq46fNDRbVHTjJrz6bKxZwehEMQxZeSf',
      createMockAccount('j4W7rVcUCxi2crhhjRq46fNDRbVHTjJrz6bKxZwehEMQxZeSf', 'Validator 1'),
    ],
    [
      'j4RLnWh3DWgc9u3Y5qZ6z7XK8Y9Z0A1B2C3D4E5F6G7H8I9J0',
      createMockAccount('j4RLnWh3DWgc9u3Y5qZ6z7XK8Y9Z0A1B2C3D4E5F6G7H8I9J0', 'Inactive Account'),
    ],
  ]),
  validatorsMap: new Map([
    [
      'j4W7rVcUCxi2crhhjRq46fNDRbVHTjJrz6bKxZwehEMQxZeSf',
      createMockValidator('j4W7rVcUCxi2crhhjRq46fNDRbVHTjJrz6bKxZwehEMQxZeSf'),
    ],
  ]),
  totalStake: new BN('350000000000000'),
  totalClaimable: new BN('15000000000000'),
  showFilter: true,
}

export const WithUnlocking = Template.bind({})
WithUnlocking.args = {
  positions: [
    createMockPosition({
      stash: 'j4VdDQVdwFYfQ2MvEdLT2EYZx4ALPQQ6yMyZopKoZEQmXcJrT',
      totalStake: new BN('100000000000000'),
      activeStake: new BN('50000000000000'),
      unlocking: [
        {
          era: 1000,
          value: new BN('50000000000000'),
        },
      ],
    }),
  ],
  accountsMap: new Map([
    [
      'j4VdDQVdwFYfQ2MvEdLT2EYZx4ALPQQ6yMyZopKoZEQmXcJrT',
      createMockAccount('j4VdDQVdwFYfQ2MvEdLT2EYZx4ALPQQ6yMyZopKoZEQmXcJrT', 'Unlocking Account'),
    ],
  ]),
  validatorsMap: new Map(),
  totalStake: new BN('100000000000000'),
  totalClaimable: new BN('0'),
  showFilter: true,
}

export const NoFilter = Template.bind({})
NoFilter.args = {
  positions: [
    createMockPosition(),
    createMockPosition({
      stash: 'j4W7rVcUCxi2crhhjRq46fNDRbVHTjJrz6bKxZwehEMQxZeSf',
      role: 'validator',
      validatorPrefsSet: true,
    }),
  ],
  accountsMap: new Map([
    [
      'j4VdDQVdwFYfQ2MvEdLT2EYZx4ALPQQ6yMyZopKoZEQmXcJrT',
      createMockAccount('j4VdDQVdwFYfQ2MvEdLT2EYZx4ALPQQ6yMyZopKoZEQmXcJrT', 'Account 1'),
    ],
    [
      'j4W7rVcUCxi2crhhjRq46fNDRbVHTjJrz6bKxZwehEMQxZeSf',
      createMockAccount('j4W7rVcUCxi2crhhjRq46fNDRbVHTjJrz6bKxZwehEMQxZeSf', 'Account 2'),
    ],
  ]),
  validatorsMap: new Map(),
  totalStake: new BN('200000000000000'),
  totalClaimable: new BN('10000000000000'),
  showFilter: false,
}

export const EmptyPositions = Template.bind({})
EmptyPositions.args = {
  positions: [],
  accountsMap: new Map(),
  validatorsMap: new Map(),
  totalStake: new BN('0'),
  totalClaimable: new BN('0'),
  showFilter: true,
}

// Story specifically for testing Set Nominee and Stop buttons
export const WithSetNomineeAndStopButtons = Template.bind({})
WithSetNomineeAndStopButtons.args = {
  positions: [
    createMockPosition({
      stash: 'j4VdDQVdwFYfQ2MvEdLT2EYZx4ALPQQ6yMyZopKoZEQmXcJrT',
      controller: 'j4VdDQVdwFYfQ2MvEdLT2EYZx4ALPQQ6yMyZopKoZEQmXcJrT', // Controller set - Stop button enabled
      role: 'nominator',
      nominations: ['j4W7rVcUCxi2crhhjRq46fNDRbVHTjJrz6bKxZwehEMQxZeSf'],
      totalStake: new BN('100000000000000'),
      activeStake: new BN('100000000000000'),
    }),
    createMockPosition({
      stash: 'j4W7rVcUCxi2crhhjRq46fNDRbVHTjJrz6bKxZwehEMQxZeSf',
      controller: 'j4W7rVcUCxi2crhhjRq46fNDRbVHTjJrz6bKxZwehEMQxZeSf', // Controller set - Stop button enabled
      role: 'validator',
      validatorPrefsSet: true,
      totalStake: new BN('200000000000000'),
      activeStake: new BN('200000000000000'),
    }),
    createMockPosition({
      stash: 'j4UYhDYJ4pz2ihhDDzu69v2JTVeGaGmTebmBdWaX2ANVinXyE', // BOB - valid test address
      controller: undefined, // No controller - Stop button disabled
      role: 'nominator',
      nominations: [],
      totalStake: new BN('50000000000000'),
      activeStake: new BN('50000000000000'),
    }),
  ],
  accountsMap: new Map([
    [
      'j4VdDQVdwFYfQ2MvEdLT2EYZx4ALPQQ6yMyZopKoZEQmXcJrT',
      createMockAccount('j4VdDQVdwFYfQ2MvEdLT2EYZx4ALPQQ6yMyZopKoZEQmXcJrT', 'Nominator with Controller'),
    ],
    [
      'j4W7rVcUCxi2crhhjRq46fNDRbVHTjJrz6bKxZwehEMQxZeSf',
      createMockAccount('j4W7rVcUCxi2crhhjRq46fNDRbVHTjJrz6bKxZwehEMQxZeSf', 'Validator with Controller'),
    ],
    [
      'j4UYhDYJ4pz2ihhDDzu69v2JTVeGaGmTebmBdWaX2ANVinXyE', // BOB - valid test address
      createMockAccount('j4UYhDYJ4pz2ihhDDzu69v2JTVeGaGmTebmBdWaX2ANVinXyE', 'Nominator without Controller'),
    ],
  ]),
  validatorsMap: new Map([
    [
      'j4W7rVcUCxi2crhhjRq46fNDRbVHTjJrz6bKxZwehEMQxZeSf',
      createMockValidator('j4W7rVcUCxi2crhhjRq46fNDRbVHTjJrz6bKxZwehEMQxZeSf'),
    ],
  ]),
  totalStake: new BN('350000000000000'),
  totalClaimable: new BN('15000000000000'),
  showFilter: true,
}
