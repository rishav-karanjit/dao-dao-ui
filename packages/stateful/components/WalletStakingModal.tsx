import { coin } from '@cosmjs/stargate'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useSetRecoilState } from 'recoil'

import {
  nativeDelegationInfoSelector,
  nativeUnstakingDurationSecondsSelector,
  refreshWalletBalancesIdAtom,
  validatorsSelector,
} from '@dao-dao/state/recoil'
import {
  StakingModal,
  StakingModalProps,
  StakingMode,
  useCachedLoadable,
  useChainContext,
} from '@dao-dao/stateless'
import {
  CHAIN_GAS_MULTIPLIER,
  convertDenomToMicroDenomStringWithDecimals,
  convertMicroDenomToDenomWithDecimals,
  cwMsgToEncodeObject,
  processError,
} from '@dao-dao/utils'

import { useAwaitNextBlock, useWallet, useWalletInfo } from '../hooks'

export type WalletStakingModalProps = Pick<
  StakingModalProps,
  'visible' | 'onClose'
>

export const WalletStakingModal = (props: WalletStakingModalProps) => {
  const { t } = useTranslation()

  const {
    chain: { chain_id: chainId },
    nativeToken,
  } = useChainContext()
  const { address: walletAddress = '', getSigningCosmWasmClient } = useWallet()

  if (!nativeToken) {
    throw new Error(t('error.missingNativeToken'))
  }

  const { walletBalance, refreshBalances } = useWalletInfo()
  // Refreshes validator balances.
  const setRefreshValidatorBalances = useSetRecoilState(
    refreshWalletBalancesIdAtom('')
  )

  const awaitNextBlock = useAwaitNextBlock()

  const [amount, setAmount] = useState(0)
  const [loading, setLoading] = useState(false)

  const validatorsLoadable = useCachedLoadable(
    validatorsSelector({
      chainId,
    })
  )
  const unstakingDurationLoadable = useCachedLoadable(
    nativeUnstakingDurationSecondsSelector({
      chainId,
    })
  )

  const nativeDelegationInfo = useCachedLoadable(
    nativeDelegationInfoSelector({
      address: walletAddress,
      chainId,
    })
  )
  const stakes =
    nativeDelegationInfo.state === 'hasValue' && nativeDelegationInfo.contents
      ? nativeDelegationInfo.contents.delegations.map(
          ({ validator, delegated, pendingReward }) => ({
            token: nativeToken,
            validator,
            amount: convertMicroDenomToDenomWithDecimals(
              delegated.amount,
              nativeToken.decimals
            ),
            rewards: convertMicroDenomToDenomWithDecimals(
              pendingReward.amount,
              nativeToken.decimals
            ),
          })
        )
      : []

  const onAction = async (
    mode: StakingMode,
    amount: number,
    validator?: string | undefined
  ) => {
    // Should never happen.
    if (!validator) {
      toast.error(t('error.noValidatorSelected'))
      return
    }
    if (!walletAddress) {
      toast.error(t('error.logInToContinue'))
      return
    }

    setLoading(true)
    try {
      const signingCosmWasmClient = await getSigningCosmWasmClient()

      const microAmount = convertDenomToMicroDenomStringWithDecimals(
        amount,
        nativeToken.decimals
      )

      if (mode === StakingMode.Stake) {
        await signingCosmWasmClient.signAndBroadcast(
          walletAddress,
          [
            cwMsgToEncodeObject(
              {
                staking: {
                  delegate: {
                    amount: coin(microAmount, nativeToken.denomOrAddress),
                    validator,
                  },
                },
              },
              walletAddress
            ),
          ],
          CHAIN_GAS_MULTIPLIER
        )
      } else if (mode === StakingMode.Unstake) {
        await signingCosmWasmClient.signAndBroadcast(
          walletAddress,
          [
            cwMsgToEncodeObject(
              {
                staking: {
                  undelegate: {
                    amount: coin(microAmount, nativeToken.denomOrAddress),
                    validator,
                  },
                },
              },
              walletAddress
            ),
          ],
          CHAIN_GAS_MULTIPLIER
        )
      }

      // Wait a block for balances to update.
      await awaitNextBlock()
      setRefreshValidatorBalances((id) => id + 1)
      refreshBalances()

      toast.success(
        mode === StakingMode.Stake ? t('success.staked') : t('success.unstaked')
      )
      props.onClose()
    } catch (err) {
      console.error(err)
      toast.error(processError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <StakingModal
      amount={amount}
      claimableTokens={
        // Tokens are claimable somewhere else.
        0
      }
      initialMode={StakingMode.Stake}
      loading={loading}
      loadingStakableTokens={
        walletBalance === undefined
          ? { loading: true }
          : {
              loading: false,
              data: walletBalance,
            }
      }
      onAction={onAction}
      setAmount={setAmount}
      token={nativeToken}
      unstakingDuration={
        unstakingDurationLoadable.state === 'hasValue'
          ? { time: unstakingDurationLoadable.contents }
          : null
      }
      validatorPicker={{
        validators:
          validatorsLoadable.state !== 'hasValue'
            ? []
            : validatorsLoadable.contents,
        stakes,
      }}
      {...props}
    />
  )
}
