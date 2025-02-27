import { coin } from '@cosmjs/amino'
import { useCallback, useEffect, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { constSelector, useRecoilValue } from 'recoil'

import { MsgTransfer } from '@dao-dao/protobuf/codegen/ibc/applications/transfer/v1/tx'
import { genericTokenSelector } from '@dao-dao/state/recoil'
import { MoneyEmoji, useCachedLoadingWithError } from '@dao-dao/stateless'
import {
  CosmosMsgForEmpty,
  Entity,
  TokenType,
  UseDecodedCosmosMsg,
} from '@dao-dao/types'
import {
  ActionComponent,
  ActionContextType,
  ActionKey,
  ActionMaker,
  UseDefaults,
  UseTransformToCosmos,
} from '@dao-dao/types/actions'
import {
  convertDenomToMicroDenomStringWithDecimals,
  convertMicroDenomToDenomWithDecimals,
  decodePolytoneExecuteMsg,
  getChainForChainId,
  getChainForChainName,
  getIbcTransferInfoBetweenChains,
  getIbcTransferInfoFromChainSource,
  isDecodedStargateMsg,
  isValidBech32Address,
  isValidContractAddress,
  makeBankMessage,
  makeStargateMessage,
  makeWasmMessage,
  maybeGetNativeTokenForChainId,
  maybeMakePolytoneExecuteMessage,
  objectMatchesStructure,
  transformBech32Address,
} from '@dao-dao/utils'

import { AddressInput } from '../../../../components'
import { useWallet } from '../../../../hooks/useWallet'
import { entitySelector } from '../../../../recoil'
import { useTokenBalances } from '../../../hooks/useTokenBalances'
import { useActionOptions } from '../../../react'
import {
  SpendData,
  SpendComponent as StatelessSpendComponent,
} from './Component'

const useDefaults: UseDefaults<SpendData> = () => {
  const {
    chain: { chain_id: chainId },
  } = useActionOptions()
  const { address: walletAddress = '' } = useWallet()

  return {
    fromChainId: chainId,
    toChainId: chainId,
    to: walletAddress,
    amount: 1,
    denom: maybeGetNativeTokenForChainId(chainId)?.denomOrAddress || '',
  }
}

const Component: ActionComponent<undefined, SpendData> = (props) => {
  const { watch } = useFormContext<SpendData>()

  const fromChainId = watch(
    (props.fieldNamePrefix + 'fromChainId') as 'fromChainId'
  )
  const denom = watch((props.fieldNamePrefix + 'denom') as 'denom')
  const recipient = watch((props.fieldNamePrefix + 'to') as 'to')
  const toChainId = watch((props.fieldNamePrefix + 'toChainId') as 'toChainId')

  const loadingTokens = useTokenBalances({
    // Load selected token when not creating, in case it is no longer returned
    // in the list of all tokens for the given DAO/wallet.
    additionalTokens: props.isCreating
      ? undefined
      : [
          {
            chainId: fromChainId,
            // Cw20 denoms are contract addresses, native denoms are not.
            type: isValidContractAddress(
              denom,
              getChainForChainId(fromChainId).bech32_prefix
            )
              ? TokenType.Cw20
              : TokenType.Native,
            denomOrAddress: denom,
          },
        ],
    allChains: true,
  })

  const [currentEntity, setCurrentEntity] = useState<Entity | undefined>()
  const loadingEntity = useCachedLoadingWithError(
    recipient &&
      isValidBech32Address(
        recipient,
        getChainForChainId(toChainId).bech32_prefix
      )
      ? entitySelector({
          address: recipient,
          chainId: toChainId,
        })
      : undefined
  )
  // Cache last successfully loaded entity.
  useEffect(() => {
    if (loadingEntity.loading || loadingEntity.errored) {
      return
    }

    setCurrentEntity(loadingEntity.data)
  }, [loadingEntity])

  return (
    <StatelessSpendComponent
      {...props}
      options={{
        tokens: loadingTokens,
        currentEntity,
        AddressInput,
      }}
    />
  )
}

const useTransformToCosmos: UseTransformToCosmos<SpendData> = () => {
  const {
    address,
    context,
    chain: { chain_id: currentChainId },
  } = useActionOptions()

  const loadingTokenBalances = useTokenBalances({
    allChains: true,
  })

  return useCallback(
    ({ fromChainId, toChainId, to, amount: _amount, denom }: SpendData) => {
      if (loadingTokenBalances.loading) {
        return
      }

      const token = loadingTokenBalances.data.find(
        ({ token }) =>
          token.chainId === fromChainId && token.denomOrAddress === denom
      )?.token
      if (!token) {
        throw new Error(`Unknown token: ${denom}`)
      }

      const amount = convertDenomToMicroDenomStringWithDecimals(
        _amount,
        token.decimals
      )

      let msg: CosmosMsgForEmpty | undefined
      if (toChainId !== fromChainId) {
        const { sourceChannel } = getIbcTransferInfoBetweenChains(
          fromChainId,
          toChainId
        )
        const sender =
          fromChainId === currentChainId
            ? address
            : context.type === ActionContextType.Dao
            ? context.info.polytoneProxies[fromChainId]
            : transformBech32Address(address, fromChainId)
        msg = makeStargateMessage({
          stargate: {
            typeUrl: MsgTransfer.typeUrl,
            value: {
              sourcePort: 'transfer',
              sourceChannel,
              token: coin(amount, denom),
              sender,
              receiver: to,
              // Timeout after 1 year. Needs to survive voting period and
              // execution delay.
              timeoutTimestamp: BigInt(
                // Nanoseconds.
                (Date.now() + 1000 * 60 * 60 * 24 * 365) * 1e6
              ),
              memo: '',
            } as MsgTransfer,
          },
        })
      } else if (token.type === TokenType.Native) {
        msg = {
          bank: makeBankMessage(amount, to, denom),
        }
      } else if (token.type === TokenType.Cw20) {
        msg = makeWasmMessage({
          wasm: {
            execute: {
              contract_addr: denom,
              funds: [],
              msg: {
                transfer: {
                  recipient: to,
                  amount,
                },
              },
            },
          },
        })
      }

      if (!msg) {
        throw new Error(`Unknown token type: ${token.type}`)
      }

      return maybeMakePolytoneExecuteMessage(currentChainId, fromChainId, msg)
    },
    [address, context, currentChainId, loadingTokenBalances]
  )
}

const useDecodedCosmosMsg: UseDecodedCosmosMsg<SpendData> = (
  msg: Record<string, any>
) => {
  let chainId = useActionOptions().chain.chain_id
  const decodedPolytone = decodePolytoneExecuteMsg(chainId, msg)
  if (decodedPolytone.match) {
    chainId = decodedPolytone.chainId
    msg = decodedPolytone.msg
  }

  const isNative =
    objectMatchesStructure(msg, {
      bank: {
        send: {
          amount: {},
          to_address: {},
        },
      },
    }) &&
    msg.bank.send.amount.length === 1 &&
    objectMatchesStructure(msg.bank.send.amount[0], {
      amount: {},
      denom: {},
    })

  const isCw20 = objectMatchesStructure(msg, {
    wasm: {
      execute: {
        contract_addr: {},
        msg: {
          transfer: {
            recipient: {},
            amount: {},
          },
        },
      },
    },
  })

  const isIbcTransfer =
    isDecodedStargateMsg(msg) &&
    msg.stargate.typeUrl === MsgTransfer.typeUrl &&
    objectMatchesStructure(msg.stargate.value, {
      sourcePort: {},
      sourceChannel: {},
      token: {},
      sender: {},
      receiver: {},
    }) &&
    msg.stargate.value.sourcePort === 'transfer'

  const token = useRecoilValue(
    isNative || isCw20 || isIbcTransfer
      ? genericTokenSelector({
          chainId,
          type: isNative || isIbcTransfer ? TokenType.Native : TokenType.Cw20,
          denomOrAddress: isIbcTransfer
            ? msg.stargate.value.token.denom
            : isNative
            ? msg.bank.send.amount[0].denom
            : msg.wasm.execute.contract_addr,
        })
      : constSelector(undefined)
  )

  if (!token) {
    return { match: false }
  }

  if (isIbcTransfer) {
    const { destinationChain } = getIbcTransferInfoFromChainSource(
      chainId,
      msg.stargate.value.sourceChannel
    )

    return {
      match: true,
      data: {
        fromChainId: chainId,
        toChainId: getChainForChainName(destinationChain.chain_name).chain_id,
        to: msg.stargate.value.receiver,
        amount: convertMicroDenomToDenomWithDecimals(
          msg.stargate.value.token.amount,
          token.decimals
        ),
        denom: token.denomOrAddress,
      },
    }
  } else if (token.type === TokenType.Native) {
    return {
      match: true,
      data: {
        fromChainId: chainId,
        toChainId: chainId,
        to: msg.bank.send.to_address,
        amount: convertMicroDenomToDenomWithDecimals(
          msg.bank.send.amount[0].amount,
          token.decimals
        ),
        denom: token.denomOrAddress,
      },
    }
  } else if (token.type === TokenType.Cw20) {
    return {
      match: true,
      data: {
        fromChainId: chainId,
        toChainId: chainId,
        to: msg.wasm.execute.msg.transfer.recipient,
        amount: convertMicroDenomToDenomWithDecimals(
          msg.wasm.execute.msg.transfer.amount,
          token.decimals
        ),
        denom: msg.wasm.execute.contract_addr,
      },
    }
  }

  return { match: false }
}

export const makeSpendAction: ActionMaker<SpendData> = ({ t, context }) => ({
  key: ActionKey.Spend,
  Icon: MoneyEmoji,
  label: t('title.spend'),
  description: t('info.spendActionDescription', {
    context: context.type,
  }),
  Component,
  useDefaults,
  useTransformToCosmos,
  useDecodedCosmosMsg,
})
