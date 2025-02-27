import { useCallback } from 'react'

import { HerbEmoji } from '@dao-dao/stateless'
import {
  ActionComponent,
  ActionKey,
  ActionMaker,
  UseDecodedCosmosMsg,
  UseDefaults,
  UseHideFromPicker,
  UseTransformToCosmos,
} from '@dao-dao/types/actions'
import {
  convertDenomToMicroDenomStringWithDecimals,
  convertMicroDenomToDenomWithDecimals,
  makeWasmMessage,
  objectMatchesStructure,
} from '@dao-dao/utils'

import { AddressInput } from '../../../../../components/AddressInput'
import { useGovernanceTokenInfo } from '../../hooks'
import {
  MintData,
  MintComponent as StatelessMintComponent,
} from './MintComponent'

const useTransformToCosmos: UseTransformToCosmos<MintData> = () => {
  const {
    tokenFactoryIssuerAddress,
    governanceTokenInfo: { decimals },
  } = useGovernanceTokenInfo()

  return useCallback(
    ({ recipient, amount }: MintData) =>
      makeWasmMessage({
        wasm: {
          execute: {
            contract_addr: tokenFactoryIssuerAddress,
            funds: [],
            msg: {
              mint: {
                to_address: recipient,
                amount: convertDenomToMicroDenomStringWithDecimals(
                  amount,
                  decimals
                ),
              },
            },
          },
        },
      }),
    [decimals, tokenFactoryIssuerAddress]
  )
}

const useDecodedCosmosMsg: UseDecodedCosmosMsg<MintData> = (
  msg: Record<string, any>
) => {
  const {
    tokenFactoryIssuerAddress,
    governanceTokenInfo: { decimals },
  } = useGovernanceTokenInfo()

  return objectMatchesStructure(msg, {
    wasm: {
      execute: {
        contract_addr: {},
        msg: {
          mint: {
            amount: {},
            to_address: {},
          },
        },
      },
    },
  }) && msg.wasm.execute.contract_addr === tokenFactoryIssuerAddress
    ? {
        match: true,
        data: {
          recipient: msg.wasm.execute.msg.mint.to_address,
          amount: convertMicroDenomToDenomWithDecimals(
            msg.wasm.execute.msg.mint.amount,
            decimals
          ),
        },
      }
    : {
        match: false,
      }
}

const Component: ActionComponent = (props) => {
  const { token } = useGovernanceTokenInfo()

  return (
    <StatelessMintComponent
      {...props}
      options={{
        govToken: token,
        AddressInput,
      }}
    />
  )
}

// Only show in picker if using cw-tokenfactory-issuer contract.
const useHideFromPicker: UseHideFromPicker = () => {
  const { tokenFactoryIssuerAddress } = useGovernanceTokenInfo()
  return !tokenFactoryIssuerAddress
}

export const makeMintAction: ActionMaker<MintData> = ({ t, address }) => {
  const useDefaults: UseDefaults<MintData> = () => ({
    recipient: address,
    amount: 1,
  })

  return {
    key: ActionKey.Mint,
    Icon: HerbEmoji,
    label: t('title.mint'),
    description: t('info.mintActionDescription'),
    Component,
    useDefaults,
    useTransformToCosmos,
    useDecodedCosmosMsg,
    useHideFromPicker,
  }
}
