import BN from 'bn.js'
import { combineLatest, map, of, switchMap } from 'rxjs'

import { useMyAccounts } from '@/accounts/hooks/useMyAccounts'
import { useApi } from '@/api/hooks/useApi'
import { BN_ZERO, ERA_DEPTH, ERA_PER_MONTH } from '@/common/constants'
import { useObservable } from '@/common/hooks/useObservable'

export interface MyStakingRewards {
  totalRewards: BN
  lastEraRewards: BN
  claimableRewards: BN
  monthlyRewards: BN
  unclaimedEras: number[]
  claimedEras: number[]
}

const STORAGE_KEY_PREFIX = 'staking_claimed_eras_'

// Get claimed eras from localStorage
const getCachedClaimedEras = (address: string): Set<number> => {
  try {
    const cached = localStorage.getItem(`${STORAGE_KEY_PREFIX}${address}`)
    if (cached) {
      const data = JSON.parse(cached)
      // Check if cache is still valid (within last 24 hours)
      if (data.timestamp && Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
        return new Set(data.claimedEras || [])
      }
    }
  } catch (e) {
    // Ignore errors
  }
  return new Set<number>()
}

// Save claimed eras to localStorage
const saveCachedClaimedEras = (address: string, claimedEras: number[]) => {
  try {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${address}`,
      JSON.stringify({
        claimedEras,
        timestamp: Date.now(),
      })
    )
  } catch (e) {
    // Ignore errors
  }
}

/**
 * Hook to calculate user's staking rewards including claimable amounts
 * Based on erasValidatorReward, erasRewardPoints, and claimed eras from ledger
 */
export const useMyStakingRewards = (): MyStakingRewards | undefined => {
  const { api } = useApi()
  const { allAccounts } = useMyAccounts()

  return useObservable(() => {
    if (!api || !allAccounts.length) return of(undefined)

    const addresses = allAccounts.map((account) => account.address)

    // Get current era and use history depth constant
    const eraInfo$ = api.query.staking.activeEra().pipe(
      map((activeEra) => {
        if (activeEra.isNone) return undefined
        const currentEra = activeEra.unwrap().index.toNumber()
        return { currentEra, historyDepth: ERA_DEPTH, oldestEra: Math.max(0, currentEra - ERA_DEPTH) }
      })
    )

    return eraInfo$.pipe(
      switchMap((eraInfo) => {
        if (!eraInfo) {
          return of({
            totalRewards: BN_ZERO,
            lastEraRewards: BN_ZERO,
            claimableRewards: BN_ZERO,
            monthlyRewards: BN_ZERO,
            unclaimedEras: [],
            claimedEras: [],
          })
        }

        const { currentEra, oldestEra } = eraInfo

        // Get ledger data for each account to find claimed eras
        const ledgers$ = combineLatest(
          addresses.map((address) =>
            api.query.staking.bonded(address).pipe(
              switchMap((bonded) => {
                if (bonded.isNone) return of(null)
                const controller = bonded.unwrap().toString()
                return api.query.staking.ledger(controller).pipe(
                  map((ledger) => {
                    if (ledger.isNone) return null
                    const ledgerData = ledger.unwrap()
                    const stash = ledgerData.stash.toString()
                    const claimedRewards = ledgerData.claimedRewards.map((era) => era.toNumber())
                    // Save to localStorage
                    saveCachedClaimedEras(stash, claimedRewards)
                    return {
                      stash,
                      claimedRewards,
                    }
                  })
                )
              })
            )
          )
        ).pipe(map((ledgers) => ledgers.filter((ledger): ledger is NonNullable<typeof ledger> => ledger !== null)))

        // Use derive.staking.erasRewards to get reward information
        const erasRewards$ = api.derive.staking.erasRewards()
        const eraPoints$ = api.derive.staking.erasPoints()

        return combineLatest([ledgers$, erasRewards$, eraPoints$]).pipe(
          switchMap(([ledgers, erasRewards, erasPoints]) => {
            if (!erasRewards.length || !erasPoints.length) {
              return of({
                totalRewards: BN_ZERO,
                lastEraRewards: BN_ZERO,
                claimableRewards: BN_ZERO,
                monthlyRewards: BN_ZERO,
                unclaimedEras: [],
                claimedEras: [],
              })
            }

            // Create a map of claimed eras for quick lookup
            const claimedErasSet = new Set<number>()
            const allClaimedEras: number[] = []

            // Load claimed eras from ledgers
            ledgers.forEach((ledger) => {
              ledger.claimedRewards.forEach((era) => {
                claimedErasSet.add(era)
                if (!allClaimedEras.includes(era)) {
                  allClaimedEras.push(era)
                }
              })
            })

            addresses.forEach((address) => {
              const hasLedger = ledgers.some((ledger) => ledger.stash === address)
              if (!hasLedger) {
                const cached = getCachedClaimedEras(address)
                cached.forEach((era) => {
                  claimedErasSet.add(era)
                  if (!allClaimedEras.includes(era)) {
                    allClaimedEras.push(era)
                  }
                })
              }
            })

            let totalRewards = BN_ZERO
            let lastEraRewards = BN_ZERO
            let claimableRewards = BN_ZERO
            let monthlyRewards = BN_ZERO
            const unclaimedEras: number[] = []
            const pointsByEra = new Map(erasPoints.map((points) => [points.era.toNumber(), points]))

            // Process each era
            erasRewards.forEach((eraReward, index) => {
              const era = eraReward.era.toNumber()
              const reward = eraReward.eraReward
              const points = pointsByEra.get(era)

              if (!points || !reward || reward.isZero()) return

              const totalPoints = points.eraPoints.toNumber()
              if (totalPoints === 0) return

              // Calculate user's share of rewards for this era
              addresses.forEach((address) => {
                const validatorPoints = points.validators[address]
                if (!validatorPoints) return

                const validatorPointsNum = validatorPoints.toNumber()
                const validatorReward = reward.muln(validatorPointsNum).divn(totalPoints)

                totalRewards = totalRewards.add(validatorReward)

                // Check if this era is claimable (not claimed yet and within history depth)
                if (!claimedErasSet.has(era) && era >= oldestEra && era < currentEra) {
                  claimableRewards = claimableRewards.add(validatorReward)
                  if (!unclaimedEras.includes(era)) {
                    unclaimedEras.push(era)
                  }
                }

                // Track monthly rewards (last 30 eras = ~7.5 days with 4 eras/day)
                if (index >= erasRewards.length - ERA_PER_MONTH) {
                  monthlyRewards = monthlyRewards.add(validatorReward)
                }

                // Track last era rewards
                if (era === currentEra - 1) {
                  lastEraRewards = lastEraRewards.add(validatorReward)
                }
              })
            })

            return of({
              totalRewards,
              lastEraRewards,
              claimableRewards,
              monthlyRewards,
              unclaimedEras: unclaimedEras.sort((a, b) => a - b),
              claimedEras: allClaimedEras.sort((a, b) => a - b),
            })
          })
        )
      })
    )
  }, [api?.isConnected, JSON.stringify(allAccounts.map((a) => a.address))])
}
