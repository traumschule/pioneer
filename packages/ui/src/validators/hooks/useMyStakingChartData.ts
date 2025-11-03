import { combineLatest, map, of, switchMap } from 'rxjs'

import { useMyAccounts } from '@/accounts/hooks/useMyAccounts'
import { useApi } from '@/api/hooks/useApi'
import { BN_ZERO, ERAS_PER_DAY } from '@/common/constants'
import { useObservable } from '@/common/hooks/useObservable'
import { formatTokenValue } from '@/common/model/formatters'

export type ChartTimeRange = 'day' | 'week' | 'month'

export interface StakingChartData {
  labels: string[]
  rewardData: number[]
  stakeData: number[]
  barData: number[]
}

/**
 * Hook to get historical staking chart data for user's accounts
 * Returns data for rewards, stakes, and slashing events over time
 */
export const useMyStakingChartData = (timeRange: ChartTimeRange = 'month'): StakingChartData | undefined => {
  const { api } = useApi()
  const { allAccounts } = useMyAccounts()

  const chartData = useObservable(() => {
    if (!api || !allAccounts.length) return of(undefined)

    const addresses = allAccounts.map((account) => account.address)

    // Determine number of eras to fetch based on time range
    const erasToFetch = timeRange === 'day' ? 4 : timeRange === 'week' ? 28 : 120 // 1 day, 7 days, 30 days

    // Get current era
    const activeEra$ = api.query.staking.activeEra().pipe(
      map((activeEra) => {
        if (activeEra.isNone) return undefined
        return activeEra.unwrap().index.toNumber()
      })
    )

    return activeEra$.pipe(
      switchMap((currentEra) => {
        if (!currentEra) return of(undefined)

        const startEra = Math.max(0, currentEra - erasToFetch)
        const eras = Array.from({ length: Math.min(erasToFetch, currentEra) }, (_, i) => startEra + i)

        // Use derive.staking for historical data
        const erasRewards$ = api.derive.staking.erasRewards()
        const erasPoints$ = api.derive.staking.erasPoints()

        // Fetch staking info for each era for user's accounts
        const eraStakes$ = combineLatest(
          eras.map((era) =>
            combineLatest(
              addresses.map((address) =>
                api.query.staking.erasStakers(era, address).pipe(
                  map((exposure) => ({
                    era,
                    address,
                    total: exposure.isEmpty ? BN_ZERO : exposure.total.toBn(),
                  }))
                )
              )
            ).pipe(
              map((stakes) => ({
                era,
                totalStake: stakes.reduce((sum, s) => sum.add(s.total), BN_ZERO),
              }))
            )
          )
        )

        // Fetch slash events for user's accounts
        const eraSlashes$ = combineLatest(
          eras.map((era) =>
            combineLatest(
              addresses.map((address) =>
                api.query.staking.validatorSlashInEra(era, address).pipe(
                  map((slash) => ({
                    era,
                    slashed: slash.isSome ? slash.unwrap()[1].toBn() : BN_ZERO,
                  }))
                )
              )
            ).pipe(
              map((slashes) => ({
                era,
                totalSlashed: slashes.reduce((sum, s) => sum.add(s.slashed), BN_ZERO),
              }))
            )
          )
        )

        return combineLatest([erasRewards$, erasPoints$, eraStakes$, eraSlashes$]).pipe(
          map(([erasRewards, erasPoints, eraStakes, eraSlashes]) => {
            // Create maps for quick lookup
            const rewardsByEra = new Map(erasRewards.map((reward) => [reward.era.toNumber(), reward]))
            const pointsByEra = new Map(erasPoints.map((points) => [points.era.toNumber(), points]))
            const stakesByEra = new Map(eraStakes.map((stake) => [stake.era, stake.totalStake]))
            const slashesByEra = new Map(eraSlashes.map((slash) => [slash.era, slash.totalSlashed]))

            // Group eras by time period to avoid duplicate labels
            const groupedData = new Map<string, { rewards: number[]; stakes: number[]; slashes: number[] }>()

            eras.forEach((era) => {
              // Determine the group key based on time range
              let groupKey: string
              if (timeRange === 'day') {
                const hoursSinceStart = (era - startEra) * 6 // 6 hours per era
                groupKey = `${hoursSinceStart}h`
              } else if (timeRange === 'week') {
                const daysSinceStart = Math.floor((era - startEra) / ERAS_PER_DAY)
                groupKey = `Day ${daysSinceStart + 1}`
              } else {
                // Month view - group by week
                const weeksSinceStart = Math.floor((era - startEra) / (ERAS_PER_DAY * 7))
                groupKey = `Week ${weeksSinceStart + 1}`
              }

              // Calculate rewards for this era
              const reward = rewardsByEra.get(era)
              const points = pointsByEra.get(era)
              let eraReward = BN_ZERO

              if (reward && points && !reward.eraReward.isZero()) {
                const totalPoints = points.eraPoints.toNumber()
                if (totalPoints > 0) {
                  addresses.forEach((address) => {
                    const validatorPoints = points.validators[address]
                    if (validatorPoints) {
                      const validatorPointsNum = validatorPoints.toNumber()
                      const share = reward.eraReward.muln(validatorPointsNum).divn(totalPoints)
                      eraReward = eraReward.add(share)
                    }
                  })
                }
              }

              // Convert BN to number in JOY tokens
              const rewardInJoy = Number(formatTokenValue(eraReward) || '0')
              const stakeInJoy = Number(formatTokenValue(stakesByEra.get(era) || BN_ZERO) || '0')
              const slashedInJoy = Number(formatTokenValue(slashesByEra.get(era) || BN_ZERO) || '0')

              // Add to group or create new group
              if (!groupedData.has(groupKey)) {
                groupedData.set(groupKey, { rewards: [], stakes: [], slashes: [] })
              }
              const group = groupedData.get(groupKey)!
              group.rewards.push(rewardInJoy)
              group.stakes.push(stakeInJoy)
              group.slashes.push(slashedInJoy)
            })

            // Aggregate grouped data (sum for rewards/slashes, average for stakes)
            const labels: string[] = []
            const rewardData: number[] = []
            const stakeData: number[] = []
            const barData: number[] = []

            Array.from(groupedData.entries()).forEach(([label, data]) => {
              labels.push(label)
              // Sum rewards and slashes for the period
              rewardData.push(data.rewards.reduce((sum, val) => sum + val, 0))
              barData.push(data.slashes.reduce((sum, val) => sum + val, 0))
              // Average stake for the period
              stakeData.push(data.stakes.reduce((sum, val) => sum + val, 0) / data.stakes.length)
            })

            return {
              labels,
              rewardData,
              stakeData,
              barData,
            }
          })
        )
      })
    )
  }, [api?.isConnected, JSON.stringify(allAccounts.map((a) => a.address)), timeRange])

  return chartData
}
