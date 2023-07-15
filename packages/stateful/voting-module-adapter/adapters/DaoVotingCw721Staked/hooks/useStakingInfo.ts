import { useWallet } from '@noahsaso/cosmodal'
import { useCallback } from 'react'
import {
  constSelector,
  useRecoilValue,
  useSetRecoilState,
  waitForAll,
} from 'recoil'

import {
  Cw721BaseSelectors,
  DaoVotingCw721StakedSelectors,
  blockHeightSelector,
  refreshClaimsIdAtom,
  refreshWalletBalancesIdAtom,
} from '@dao-dao/state'
import {
  useCachedLoadable,
  useCachedLoading,
  useCachedLoadingWithError,
  useChain,
} from '@dao-dao/stateless'
import { NftClaim } from '@dao-dao/types/contracts/DaoVotingCw721Staked'
import { claimAvailable } from '@dao-dao/utils'

import { nftCardInfoSelector } from '../../../../recoil/selectors/nft'
import { useVotingModuleAdapterOptions } from '../../../react/context'
import { UseStakingInfoOptions, UseStakingInfoResponse } from '../types'
import { useGovernanceCollectionInfo } from './useGovernanceCollectionInfo'

export const useStakingInfo = ({
  fetchClaims = false,
  fetchTotalStakedValue = false,
  fetchWalletStakedValue = false,
  fetchWalletUnstakedValue = false,
}: UseStakingInfoOptions = {}): UseStakingInfoResponse => {
  const { chain_id: chainId } = useChain()
  const { address: walletAddress } = useWallet()
  const { votingModuleAddress } = useVotingModuleAdapterOptions()

  const { collectionAddress: governanceTokenAddress } =
    useGovernanceCollectionInfo()

  const stakingContractAddress = votingModuleAddress
  const unstakingDuration =
    useRecoilValue(
      DaoVotingCw721StakedSelectors.configSelector({
        chainId,
        contractAddress: stakingContractAddress,
        params: [],
      })
    ).unstaking_duration ?? undefined

  const setRefreshTotalBalancesId = useSetRecoilState(
    refreshWalletBalancesIdAtom(undefined)
  )
  // Refresh NFTs owned by staking contract.
  const setRefreshStakedNftsId = useSetRecoilState(
    refreshWalletBalancesIdAtom(stakingContractAddress)
  )
  // Refresh totals, mostly for total staked power.
  const refreshTotals = useCallback(() => {
    setRefreshTotalBalancesId((id) => id + 1)
    setRefreshStakedNftsId((id) => id + 1)
  }, [setRefreshStakedNftsId, setRefreshTotalBalancesId])

  /// Optional

  // Claims
  const blockHeightLoadable = useCachedLoadable(
    fetchClaims
      ? blockHeightSelector({
          chainId,
        })
      : undefined
  )
  const blockHeight =
    blockHeightLoadable.state === 'hasValue' ? blockHeightLoadable.contents : 0

  const _setClaimsId = useSetRecoilState(refreshClaimsIdAtom(walletAddress))
  const refreshClaims = useCallback(
    () => _setClaimsId((id) => id + 1),
    [_setClaimsId]
  )

  const loadingClaims = useCachedLoading(
    fetchClaims && walletAddress
      ? DaoVotingCw721StakedSelectors.nftClaimsSelector({
          chainId,
          contractAddress: stakingContractAddress,
          params: [{ address: walletAddress }],
        })
      : constSelector(undefined),
    undefined
  )
  const claims = loadingClaims.loading
    ? []
    : !loadingClaims.data
    ? undefined
    : loadingClaims.data.nft_claims

  const nftClaims = claims
    ? claims.map(
        ({ token_id, release_at }): NftClaim => ({
          release_at,
          token_id,
        })
      )
    : []

  const claimsPending = blockHeight
    ? nftClaims?.filter((c) => !claimAvailable(c, blockHeight))
    : undefined
  const claimsAvailable = blockHeight
    ? nftClaims?.filter((c) => claimAvailable(c, blockHeight))
    : undefined
  const sumClaimsAvailable = claimsAvailable?.length

  // Total staked value
  const loadingTotalStakedValue = useCachedLoading(
    fetchTotalStakedValue
      ? DaoVotingCw721StakedSelectors.totalPowerAtHeightSelector({
          chainId,
          contractAddress: stakingContractAddress,
          params: [{}],
        })
      : constSelector(undefined),
    undefined
  )

  // Wallet staked value
  const loadingWalletStakedNftsLoadable = useCachedLoading(
    fetchWalletStakedValue && walletAddress
      ? DaoVotingCw721StakedSelectors.stakedNftsSelector({
          chainId,
          contractAddress: stakingContractAddress,
          params: [{ address: walletAddress }],
        })
      : undefined,
    undefined
  )

  const loadingWalletStakedNfts = useCachedLoadingWithError(
    !loadingWalletStakedNftsLoadable.loading &&
      loadingWalletStakedNftsLoadable.data
      ? waitForAll(
          loadingWalletStakedNftsLoadable.data?.map((tokenId) =>
            nftCardInfoSelector({
              chainId,
              collection: governanceTokenAddress,
              tokenId,
            })
          )
        )
      : undefined
  )

  const loadingWalletUnstakedNftsLoadable = useCachedLoadingWithError(
    fetchWalletUnstakedValue && walletAddress && governanceTokenAddress
      ? Cw721BaseSelectors.allTokensForOwnerSelector({
          chainId,
          contractAddress: governanceTokenAddress,
          owner: walletAddress,
        })
      : undefined
  )

  const loadingWalletUnstakedNfts = useCachedLoadingWithError(
    !loadingWalletUnstakedNftsLoadable.loading &&
      !loadingWalletUnstakedNftsLoadable.errored &&
      loadingWalletUnstakedNftsLoadable.data
      ? waitForAll(
          loadingWalletUnstakedNftsLoadable.data?.map((tokenId) =>
            nftCardInfoSelector({
              chainId,
              collection: governanceTokenAddress,
              tokenId,
            })
          )
        )
      : undefined
  )

  return {
    stakingContractAddress,
    unstakingDuration,
    refreshTotals,
    /// Optional
    // Claims
    blockHeight:
      blockHeightLoadable.state === 'hasValue'
        ? blockHeightLoadable.contents
        : 0,
    refreshClaims: fetchClaims ? refreshClaims : undefined,
    claims: nftClaims,
    claimsPending,
    claimsAvailable,
    sumClaimsAvailable,
    // Total staked value
    loadingTotalStakedValue: loadingTotalStakedValue.loading
      ? { loading: true }
      : !loadingTotalStakedValue.data
      ? undefined
      : {
          loading: false,
          data: Number(loadingTotalStakedValue.data.power),
        },
    // Wallet staked value
    loadingWalletStakedValue: loadingWalletStakedNftsLoadable.loading
      ? { loading: true }
      : !loadingWalletStakedNftsLoadable.data
      ? undefined
      : {
          loading: false,
          data: loadingWalletStakedNftsLoadable.data.length,
        },
    loadingWalletStakedNfts,
    loadingWalletUnstakedNfts,
  }
}
