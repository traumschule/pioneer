import BN from 'bn.js'
import { combineLatest, filter, first, map, of, switchMap, catchError } from 'rxjs'

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

interface EraInfo {
  currentEra: number
  oldestEra: number
}

export const useAllAccountsStakingRewards = (accounts: Account[]): Map<string, AccountStakingRewards> | undefined => {
  const { api } = useApi()

  return useObservable(() => {
    if (!api || !accounts.length) return of(undefined)

    const addresses = accounts.map((account) => account.address)

    // Ensure API is ready before making queries
    const isReady$ =
      'isReady' in api && typeof api.isReady === 'function'
        ? (api.isReady() as any).pipe(
            filter((ready: any) => Boolean(ready)),
            first()
          )
        : api.rpc.chain.getBlockHash(0).pipe(
            first(),
            map(() => true)
          )

    const eraInfo$ = api.query.staking.activeEra().pipe(
      map((activeEra) => {
        if (activeEra.isNone) return undefined
        const currentEra = activeEra.unwrap().index.toNumber()
        return { currentEra, oldestEra: Math.max(0, currentEra - ERA_DEPTH) }
      }),
      catchError(() => of(undefined))
    )

    return isReady$.pipe(
      switchMap(() => eraInfo$),
      switchMap((eraInfo) => {
        if (!eraInfo || typeof eraInfo !== 'object' || !('currentEra' in eraInfo) || !('oldestEra' in eraInfo)) {
          return of(new Map<string, AccountStakingRewards>())
        }

        const { currentEra, oldestEra } = eraInfo as EraInfo

        const erasRewards$ = api.derive.staking.erasRewards().pipe(catchError(() => of([])))
        const erasPoints$ = api.derive.staking.erasPoints().pipe(catchError(() => of([])))

        return combineLatest([erasRewards$, erasPoints$]).pipe(
          switchMap(([erasRewards, erasPoints]) => {
            const rewardsByEra = new Map(erasRewards.map((reward: any) => [reward.era.toNumber(), reward]))
            const pointsByEra = new Map(erasPoints.map((points: any) => [points.era.toNumber(), points]))

            const accountRewards$ = addresses.map((address) =>
              api.query.staking.bonded(address).pipe(
                catchError(() => of(null)),
                switchMap((bonded) => {
                  if (!bonded || bonded.isNone) {
                    return of({
                      address,
                      totalEarned: BN_ZERO,
                      claimable: BN_ZERO,
                      hasClaimable: false,
                    })
                  }

                  const controller = bonded.unwrap().toString()
                  return api.query.staking.ledger(controller).pipe(
                    catchError(() => of(null)),
                    map((ledger) => {
                      if (!ledger || ledger.isNone) {
                        return {
                          address,
                          totalEarned: BN_ZERO,
                          claimable: BN_ZERO,
                          hasClaimable: false,
                        }
                      }

                      const ledgerData = ledger.unwrap()
                      const claimedRewards = ledgerData.claimedRewards.map((era) => era.toNumber())

                      const unclaimedEras: number[] = []
                      for (let era = oldestEra; era < currentEra; era++) {
                        if (!claimedRewards.includes(era)) {
                          unclaimedEras.push(era)
                        }
                      }

                      let totalEarned = BN_ZERO
                      let claimable = BN_ZERO

                      for (let era = oldestEra; era < currentEra; era++) {
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
            )

            return combineLatest(accountRewards$).pipe(
              map((rewards) => {
                const rewardsMap = new Map<string, AccountStakingRewards>()
                rewards.forEach((reward) => {
                  rewardsMap.set(reward.address, reward)
                })
                return rewardsMap
              }),
              catchError(() => of(new Map()))
            )
          })
        )
      })
    )
  }, [api?.isConnected, JSON.stringify(accounts.map((a) => a.address))])
}
