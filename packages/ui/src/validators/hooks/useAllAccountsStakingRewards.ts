import BN from 'bn.js'
import { combineLatest, map, of, switchMap } from 'rxjs'

import { Account } from '@/accounts/types'
import { useApi } from '@/api/hooks/useApi'
import { BN_ZERO, ERA_DEPTH } from '@/common/constants'
import { useObservable } from '@/common/hooks/useObservable'

export interface AccountStakingRewards {
  address: string
  totalEarned: BN
  claimable: BN
  hasClaimable: boolean
}

export const useAllAccountsStakingRewards = (accounts: Account[]): Map<string, AccountStakingRewards> | undefined => {
  const { api } = useApi()

  return useObservable(() => {
    if (!api || !accounts.length) return of(undefined)

    const addresses = accounts.map((account) => account.address)

    const eraInfo$ = api.query.staking.activeEra().pipe(
      map((activeEra) => {
        if (activeEra.isNone) return undefined
        const currentEra = activeEra.unwrap().index.toNumber()
        return { currentEra, oldestEra: Math.max(0, currentEra - ERA_DEPTH) }
      })
    )

    return eraInfo$.pipe(
      switchMap((eraInfo) => {
        if (!eraInfo) return of(new Map())

        // Fetch staking data for all accounts in parallel
        const accountRewards$ = addresses.map((address) =>
          api.query.staking.bonded(address).pipe(
            switchMap((bonded) => {
              if (bonded.isNone) {
                return of({
                  address,
                  totalEarned: BN_ZERO,
                  claimable: BN_ZERO,
                  hasClaimable: false,
                })
              }

              const controller = bonded.unwrap().toString()
              return api.query.staking.ledger(controller).pipe(
                switchMap((ledger) => {
                  if (ledger.isNone) {
                    return of({
                      address,
                      totalEarned: BN_ZERO,
                      claimable: BN_ZERO,
                      hasClaimable: false,
                    })
                  }

                  const ledgerData = ledger.unwrap()
                  const claimedRewards = ledgerData.claimedRewards.map((era) => era.toNumber())

                  // Find unclaimed eras
                  const unclaimedEras: number[] = []
                  for (let era = eraInfo.oldestEra; era < eraInfo.currentEra; era++) {
                    if (!claimedRewards.includes(era)) {
                      unclaimedEras.push(era)
                    }
                  }

                  // Get reward points
                  const erasRewards$ = api.derive.staking.erasRewards()
                  const erasPoints$ = api.derive.staking.erasPoints()

                  return combineLatest([erasRewards$, erasPoints$]).pipe(
                    map(([erasRewards, erasPoints]) => {
                      const rewardsByEra = new Map(erasRewards.map((reward: any) => [reward.era.toNumber(), reward]))
                      const pointsByEra = new Map(erasPoints.map((points: any) => [points.era.toNumber(), points]))

                      let totalEarned = BN_ZERO
                      let claimable = BN_ZERO

                      for (let era = eraInfo.oldestEra; era < eraInfo.currentEra; era++) {
                        const reward = rewardsByEra.get(era)
                        const points = pointsByEra.get(era)

                        if (!reward || !points || reward.eraReward.isZero()) continue

                        const totalPoints = points.eraPoints.toNumber()
                        if (totalPoints === 0) continue

                        const validatorPoints = points.validators[address]
                        if (validatorPoints) {
                          const validatorPointsNum = validatorPoints.toNumber()
                          const validatorReward = reward.eraReward.muln(validatorPointsNum).divn(totalPoints)

                          totalEarned = totalEarned.add(validatorReward)

                          if (unclaimedEras.includes(era)) {
                            claimable = claimable.add(validatorReward)
                          }
                        }
                      }

                      return {
                        address,
                        totalEarned,
                        claimable,
                        hasClaimable: !claimable.isZero(),
                      }
                    })
                  )
                })
              )
            })
          )
        )

        return combineLatest(accountRewards$).pipe(
          map((rewards) => {
            const rewardsMap = new Map<string, AccountStakingRewards>()
            rewards.forEach((reward) => {
              rewardsMap.set(reward.address, reward)
            })
            return rewardsMap
          })
        )
      })
    )
  }, [api?.isConnected, JSON.stringify(accounts.map((a) => a.address))])
}
