import {
  AmountWithTimestampAndDenom,
  Duration,
  DurationWithUnits,
  GenericToken,
  LoadingData,
} from '@dao-dao/types'
import { TokenInfoResponse } from '@dao-dao/types/contracts/Cw20Base'
import { Claim } from '@dao-dao/types/contracts/DaoVotingNativeStaked'

export interface DaoCreationConfig {
  denom: string
  _tokenError?: string
  unstakingDuration: DurationWithUnits
}

export interface UseStakingInfoOptions {
  fetchClaims?: boolean
  fetchTotalStakedValue?: boolean
  fetchWalletStakedValue?: boolean
  fetchWalletUnstakedValue?: boolean
}

export interface UseStakingInfoResponse {
  stakingContractAddress: string
  unstakingDuration?: Duration
  refreshTotals: () => void
  /// Optional
  // Claims
  blockHeight?: number
  refreshClaims?: () => void
  claims?: Claim[]
  claimsPending?: Claim[]
  claimsAvailable?: Claim[]
  sumClaimsAvailable?: number
  // Total staked value
  loadingTotalStakedValue?: LoadingData<number>
  // Wallet staked value
  loadingWalletStakedValue?: LoadingData<number>
}

export interface UseGovernanceTokenInfoOptions {
  fetchWalletBalance?: boolean
  fetchTreasuryBalance?: boolean
  fetchUsdcPrice?: boolean
}

// TODO: Make improved standard that covers native tokens and custom info.
export interface UseGovernanceTokenInfoResponse {
  stakingContractAddress: string
  governanceTokenAddress: string
  isFactory: boolean
  // Will be defined if the governance token is a token factory denom and a
  // token factory issuer contract exists.
  tokenFactoryIssuerAddress: string | undefined
  governanceTokenInfo: TokenInfoResponse
  token: GenericToken
  /// Optional
  // Wallet balance
  loadingWalletBalance?: LoadingData<number>
  // Treasury balance
  loadingTreasuryBalance?: LoadingData<number>
  // Price
  loadingPrice?: LoadingData<AmountWithTimestampAndDenom>
}
