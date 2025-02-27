import {
  MsgClearAdminEncodeObject,
  MsgExecuteContractEncodeObject,
  MsgInstantiateContractEncodeObject,
  MsgMigrateContractEncodeObject,
  MsgUpdateAdminEncodeObject,
} from '@cosmjs/cosmwasm-stargate'
import { fromBase64, fromUtf8, toBase64 } from '@cosmjs/encoding'
import { EncodeObject, GeneratedType, Registry } from '@cosmjs/proto-signing'
import {
  AminoTypes,
  MsgBeginRedelegateEncodeObject,
  MsgDelegateEncodeObject,
  MsgSendEncodeObject,
  MsgUndelegateEncodeObject,
  MsgVoteEncodeObject,
  MsgWithdrawDelegatorRewardEncodeObject,
} from '@cosmjs/stargate'
import Long from 'long'

import {
  cosmosAminoConverters,
  cosmosProtoRegistry,
  cosmwasmAminoConverters,
  cosmwasmProtoRegistry,
  gaiaAminoConverters,
  gaiaProtoRegistry,
  google,
  ibcAminoConverters,
  ibcProtoRegistry,
  junoAminoConverters,
  junoProtoRegistry,
  osmosisAminoConverters,
  osmosisProtoRegistry,
  publicawesomeAminoConverters as stargazeAminoConverters,
  publicawesomeProtoRegistry as stargazeProtoRegistry,
} from '@dao-dao/protobuf'
import { MsgSend } from '@dao-dao/protobuf/codegen/cosmos/bank/v1beta1/tx'
import {
  MsgSetWithdrawAddress,
  MsgWithdrawDelegatorReward,
} from '@dao-dao/protobuf/codegen/cosmos/distribution/v1beta1/tx'
import { MsgExecLegacyContent } from '@dao-dao/protobuf/codegen/cosmos/gov/v1/tx'
import { TextProposal } from '@dao-dao/protobuf/codegen/cosmos/gov/v1beta1/gov'
import { MsgVote } from '@dao-dao/protobuf/codegen/cosmos/gov/v1beta1/tx'
import {
  MsgBeginRedelegate,
  MsgDelegate,
  MsgUndelegate,
} from '@dao-dao/protobuf/codegen/cosmos/staking/v1beta1/tx'
import {
  MsgClearAdmin,
  MsgExecuteContract,
  MsgInstantiateContract,
  MsgMigrateContract,
  MsgUpdateAdmin,
} from '@dao-dao/protobuf/codegen/cosmwasm/wasm/v1/tx'
import { Any } from '@dao-dao/protobuf/codegen/google/protobuf/any'
import {
  CosmosMsgFor_Empty,
  DecodedStargateMsg,
  GovProposal,
  GovProposalV1,
  GovProposalV1DecodedMessages,
  GovProposalVersion,
  GovProposalWithDecodedContent,
  StargateMsg,
} from '@dao-dao/types'

import { processError } from '../error'
import {
  cwVoteOptionToGovVoteOption,
  govVoteOptionToCwVoteOption,
} from '../gov'
import { objectMatchesStructure } from '../objectMatchesStructure'

// Convert CosmWasm message to its encoded protobuf equivalent.
export const cwMsgToProtobuf = (
  ...params: Parameters<typeof cwMsgToEncodeObject>
): Any => {
  const { typeUrl, value } = cwMsgToEncodeObject(...params)
  return {
    typeUrl,
    value: encodeProtobufValue(typeUrl, value),
  }
}

// Convert protobuf to its CosmWasm message equivalent.
export const protobufToCwMsg = (
  ...params: Parameters<typeof decodeRawProtobufMsg>
): {
  msg: CosmosMsgFor_Empty
  sender: string
} => decodedStargateMsgToCw(decodeRawProtobufMsg(...params))

export const cwMsgToEncodeObject = (
  msg: CosmosMsgFor_Empty,
  sender: string
): EncodeObject => {
  if ('bank' in msg) {
    const bankMsg = msg.bank

    if ('send' in bankMsg) {
      const encodeObject: MsgSendEncodeObject = {
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        value: {
          fromAddress: sender,
          toAddress: bankMsg.send.to_address,
          amount: bankMsg.send.amount,
        },
      }

      return encodeObject
    }

    // burn does not exist?

    throw new Error('Unsupported bank module message.')
  }

  if ('staking' in msg) {
    const stakingMsg = msg.staking

    if ('delegate' in stakingMsg) {
      const encodeObject: MsgDelegateEncodeObject = {
        typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
        value: {
          delegatorAddress: sender,
          validatorAddress: stakingMsg.delegate.validator,
          amount: stakingMsg.delegate.amount,
        },
      }
      return encodeObject
    }

    if ('undelegate' in stakingMsg) {
      const encodeObject: MsgUndelegateEncodeObject = {
        typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
        value: {
          delegatorAddress: sender,
          validatorAddress: stakingMsg.undelegate.validator,
          amount: stakingMsg.undelegate.amount,
        },
      }
      return encodeObject
    }

    if ('redelegate' in stakingMsg) {
      const encodeObject: MsgBeginRedelegateEncodeObject = {
        typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
        value: {
          delegatorAddress: sender,
          validatorSrcAddress: stakingMsg.redelegate.src_validator,
          validatorDstAddress: stakingMsg.redelegate.dst_validator,
          amount: stakingMsg.redelegate.amount,
        },
      }
      return encodeObject
    }

    throw new Error('Unsupported staking module message.')
  }

  if ('distribution' in msg) {
    const distributionMsg = msg.distribution

    if ('withdraw_delegator_reward' in distributionMsg) {
      const encodeObject: MsgWithdrawDelegatorRewardEncodeObject = {
        typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
        value: {
          delegatorAddress: sender,
          validatorAddress: distributionMsg.withdraw_delegator_reward.validator,
        },
      }
      return encodeObject
    }

    if ('set_withdraw_address' in distributionMsg) {
      const encodeObject = {
        typeUrl: MsgSetWithdrawAddress.typeUrl,
        value: MsgSetWithdrawAddress.fromPartial({
          delegatorAddress: sender,
          withdrawAddress: distributionMsg.set_withdraw_address.address,
        }),
      }
      return encodeObject
    }

    throw new Error('Unsupported distribution module message.')
  }

  if ('stargate' in msg) {
    return decodeStargateMessage(msg).stargate
  }

  if ('wasm' in msg) {
    const wasmMsg = msg.wasm

    // MsgStoreCodeEncodeObject missing from CosmosMsgFor_Empty.

    if ('execute' in wasmMsg) {
      const encodeObject: MsgExecuteContractEncodeObject = {
        typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
        value: {
          sender,
          contract: wasmMsg.execute.contract_addr,
          funds: wasmMsg.execute.funds,
          msg: fromBase64(wasmMsg.execute.msg),
        },
      }
      return encodeObject
    }

    if ('instantiate' in wasmMsg) {
      const encodeObject: MsgInstantiateContractEncodeObject = {
        typeUrl: '/cosmwasm.wasm.v1.MsgInstantiateContract',
        value: {
          sender,
          admin: wasmMsg.instantiate.admin ?? undefined,
          codeId: Long.fromInt(wasmMsg.instantiate.code_id),
          label: wasmMsg.instantiate.label,
          msg: fromBase64(wasmMsg.instantiate.msg),
          funds: wasmMsg.instantiate.funds,
        },
      }
      return encodeObject
    }

    if ('instantiate2' in wasmMsg) {
      const encodeObject: EncodeObject = {
        typeUrl: '/cosmwasm.wasm.v1.MsgInstantiateContract2',
        value: {
          sender,
          admin: wasmMsg.instantiate2.admin ?? undefined,
          codeId: Long.fromInt(wasmMsg.instantiate2.code_id),
          label: wasmMsg.instantiate2.label,
          msg: fromBase64(wasmMsg.instantiate2.msg),
          funds: wasmMsg.instantiate2.funds,
          salt: fromBase64(wasmMsg.instantiate2.salt),
          fixMsg: wasmMsg.instantiate2.fix_msg,
        },
      }
      return encodeObject
    }

    if ('migrate' in wasmMsg) {
      const encodeObject: MsgMigrateContractEncodeObject = {
        typeUrl: '/cosmwasm.wasm.v1.MsgMigrateContract',
        value: {
          sender,
          contract: wasmMsg.migrate.contract_addr,
          codeId: Long.fromInt(wasmMsg.migrate.new_code_id),
          msg: fromBase64(wasmMsg.migrate.msg),
        },
      }
      return encodeObject
    }

    if ('update_admin' in wasmMsg) {
      const encodeObject: MsgUpdateAdminEncodeObject = {
        typeUrl: '/cosmwasm.wasm.v1.MsgUpdateAdmin',
        value: {
          sender,
          newAdmin: wasmMsg.update_admin.admin,
          contract: wasmMsg.update_admin.contract_addr,
        },
      }
      return encodeObject
    }

    if ('clear_admin' in wasmMsg) {
      const encodeObject: MsgClearAdminEncodeObject = {
        typeUrl: '/cosmwasm.wasm.v1.MsgClearAdmin',
        value: {
          sender,
          contract: wasmMsg.clear_admin.contract_addr,
        },
      }
      return encodeObject
    }

    throw new Error('Unsupported wasm module message.')
  }

  if ('gov' in msg) {
    const govMsg = msg.gov

    // MsgDepositEncodeObject and MsgSubmitProposalEncodeObject missing from
    // CosmosMsgFor_Empty.

    if ('vote' in govMsg) {
      const encodeObject: MsgVoteEncodeObject = {
        typeUrl: '/cosmos.gov.v1beta1.MsgVote',
        value: {
          proposalId: Long.fromInt(govMsg.vote.proposal_id),
          voter: sender,
          option: cwVoteOptionToGovVoteOption(govMsg.vote.vote),
        },
      }
      return encodeObject
    }

    throw new Error('Unsupported gov module message.')
  }

  throw new Error('Unsupported cosmos message.')
}

// This should mirror the encoder function above.
export const decodedStargateMsgToCw = ({
  typeUrl,
  value,
}: DecodedStargateMsg['stargate']): {
  msg: CosmosMsgFor_Empty
  sender: string
} => {
  let msg: CosmosMsgFor_Empty
  let sender = ''
  switch (typeUrl) {
    case MsgSend.typeUrl:
      msg = {
        bank: {
          send: {
            amount: value.amount,
            to_address: value.toAddress,
          },
        },
      }
      sender = value.fromAddress
      break
    case MsgDelegate.typeUrl:
      msg = {
        staking: {
          delegate: {
            amount: value.amount,
            validator: value.validatorAddress,
          },
        },
      }
      sender = value.delegatorAddress
      break
    case MsgUndelegate.typeUrl:
      msg = {
        staking: {
          undelegate: {
            amount: value.amount,
            validator: value.validatorAddress,
          },
        },
      }
      sender = value.delegatorAddress
      break
    case MsgBeginRedelegate.typeUrl:
      msg = {
        staking: {
          redelegate: {
            amount: value.amount,
            src_validator: value.validatorSrcAddress,
            dst_validator: value.validatorDstAddress,
          },
        },
      }
      sender = value.delegatorAddress
      break
    case MsgWithdrawDelegatorReward.typeUrl:
      msg = {
        distribution: {
          withdraw_delegator_reward: {
            validator: value.validatorAddress,
          },
        },
      }
      sender = value.delegatorAddress
      break
    case MsgExecuteContract.typeUrl:
      msg = {
        wasm: {
          execute: {
            contract_addr: value.contract,
            funds: value.funds,
            msg: toBase64(value.msg),
          },
        },
      }
      sender = value.sender
      break
    case MsgInstantiateContract.typeUrl:
      msg = {
        wasm: {
          instantiate: {
            admin: value.admin,
            code_id: Number(value.codeId),
            label: value.label,
            msg: toBase64(value.msg),
            funds: value.funds,
          },
        },
      }
      sender = value.sender
      break
    case MsgMigrateContract.typeUrl:
      msg = {
        wasm: {
          migrate: {
            contract_addr: value.contract,
            new_code_id: Number(value.codeId),
            msg: toBase64(value.msg),
          },
        },
      }
      sender = value.sender
      break
    case MsgUpdateAdmin.typeUrl:
      msg = {
        wasm: {
          update_admin: {
            admin: value.newAdmin,
            contract_addr: value.contract,
          },
        },
      }
      sender = value.sender
      break
    case MsgClearAdmin.typeUrl:
      msg = {
        wasm: {
          clear_admin: {
            contract_addr: value.contract,
          },
        },
      }
      sender = value.sender
      break
    case MsgVote.typeUrl:
      msg = {
        gov: {
          vote: {
            proposal_id: Number(value.proposalId),
            vote: govVoteOptionToCwVoteOption(value.option),
          },
        },
      }
      sender = value.voter
      break
    default:
      msg = makeStargateMessage({
        stargate: {
          typeUrl,
          value,
        },
      })
      break
  }

  return {
    msg,
    sender,
  }
}

export const PROTOBUF_TYPES: ReadonlyArray<[string, GeneratedType]> = [
  ...cosmosProtoRegistry,
  ...cosmwasmProtoRegistry,
  ['/google.protobuf.Timestamp', google.protobuf.Timestamp as GeneratedType],
  ...junoProtoRegistry,
  ...osmosisProtoRegistry,
  ...ibcProtoRegistry,
  ...stargazeProtoRegistry,
  ...gaiaProtoRegistry,
]
export const typesRegistry = new Registry(PROTOBUF_TYPES)

export const aminoTypes = new AminoTypes({
  ...cosmosAminoConverters,
  ...cosmwasmAminoConverters,
  ...junoAminoConverters,
  ...osmosisAminoConverters,
  ...ibcAminoConverters,
  ...stargazeAminoConverters,
  ...gaiaAminoConverters,
})

// Encodes a protobuf message value from its JSON representation into a byte
// array.
export const encodeProtobufValue = (
  typeUrl: string,
  value: any
): Uint8Array => {
  const type = typesRegistry.lookupType(typeUrl)
  if (!type) {
    throw new Error(`Type ${typeUrl} not found in registry.`)
  }
  const encodedValue = type.encode(value).finish()
  return encodedValue
}

// Decodes an encoded protobuf message's value from a Uint8Array or base64
// string into its JSON representation.
export const decodeProtobufValue = (
  typeUrl: string,
  encodedValue: string | Uint8Array
): any => {
  const type = typesRegistry.lookupType(typeUrl)
  if (!type) {
    throw new Error(`Type ${typeUrl} not found in registry.`)
  }

  const decodedValue = type.decode(
    typeof encodedValue === 'string' ? fromBase64(encodedValue) : encodedValue
  )
  return decodedValue
}

// Decodes a protobuf message from `Any` into its JSON representation.
export const decodeRawProtobufMsg = ({
  typeUrl,
  value,
}: Any): DecodedStargateMsg['stargate'] => ({
  typeUrl,
  value: decodeProtobufValue(typeUrl, value),
})

// Encodes a protobuf message from its JSON representation into a `StargateMsg`
// that `CosmWasm` understands.
export const makeStargateMessage = ({
  stargate: { typeUrl, value },
}: DecodedStargateMsg): StargateMsg => ({
  stargate: {
    type_url: typeUrl,
    value: toBase64(encodeProtobufValue(typeUrl, prepareProtobufJson(value))),
  },
})

// Decodes an encoded protobuf message from CosmWasm's `StargateMsg` into its
// JSON representation.
export const decodeStargateMessage = ({
  stargate: { type_url, value },
}: StargateMsg): DecodedStargateMsg => {
  return {
    stargate: {
      typeUrl: type_url,
      value: decodeProtobufValue(type_url, value),
    },
  }
}

// Decode governance proposal v1 messages using a protobuf.
export const decodeGovProposalV1Messages = (
  messages: GovProposalV1['proposal']['messages']
): GovProposalV1DecodedMessages =>
  messages.map((msg) => {
    try {
      return protobufToCwMsg(msg).msg
    } catch (err) {
      // If protobuf not found, capture error and return placeholder.
      console.error(processError(err, { forceCapture: true }))
      return {
        stargate: {
          type_url: msg.typeUrl,
          value: toBase64(msg.value),
        },
      }
    }
  })

// Decode governance proposal content using a protobuf.
export const decodeGovProposal = (
  govProposal: GovProposal
): GovProposalWithDecodedContent => {
  if (govProposal.version === GovProposalVersion.V1_BETA_1) {
    let title = govProposal.proposal.content?.title || ''
    let description = govProposal.proposal.content?.description || ''
    // If content not decoded and stuck as Any, decode as TextProposal to get
    // the title and description.
    if (
      govProposal.proposal.content?.$typeUrl === Any.typeUrl &&
      govProposal.proposal.content.value instanceof Uint8Array
    ) {
      try {
        const content = TextProposal.decode(govProposal.proposal.content.value)
        title = content.title
        description = content.description
      } catch (err) {
        console.error(err)
      }
    }

    return {
      ...govProposal,
      title,
      description,
      decodedContent: govProposal.proposal.content,
    }
  }

  const decodedMessages = decodeGovProposalV1Messages(
    govProposal.proposal.messages.filter(
      ({ typeUrl }) => typeUrl !== MsgExecLegacyContent.typeUrl
    )
  )
  const legacyContent = govProposal.proposal.messages
    .filter(({ typeUrl }) => typeUrl === MsgExecLegacyContent.typeUrl)
    .map((msg) => MsgExecLegacyContent.decode(msg.value).content)

  return {
    ...govProposal,
    title: govProposal.proposal.title,
    description: govProposal.proposal.summary,
    decodedMessages,
    legacyContent,
  }
}

export const isDecodedStargateMsg = (msg: any): msg is DecodedStargateMsg =>
  objectMatchesStructure(msg, {
    stargate: {
      typeUrl: {},
      value: {},
    },
  }) && typeof msg.stargate.value === 'object'

// Decode any nested protobufs into JSON. Also decodes longs since those show up
// often.
export const decodeRawMessagesForDisplay = (msg: any): any =>
  typeof msg !== 'object' || msg === null
    ? msg
    : Array.isArray(msg)
    ? msg.map(decodeRawMessagesForDisplay)
    : Long.isLong(msg)
    ? msg.toString()
    : msg instanceof Date
    ? msg.toISOString()
    : msg instanceof Uint8Array
    ? toBase64(msg)
    : objectMatchesStructure(msg, {
        typeUrl: {},
        value: {},
      }) &&
      typeof (msg as Any).typeUrl === 'string' &&
      (msg as Any).value instanceof Uint8Array
    ? (() => {
        try {
          return decodeRawProtobufMsg(msg as Any)
        } catch {
          return msg
        }
      })()
    : Object.entries(msg).reduce((acc, [key, value]) => {
        let decodedValue = value
        if (key === 'msg' && value instanceof Uint8Array) {
          decodedValue = fromUtf8(value)
        }

        return {
          ...acc,
          [key]: decodeRawMessagesForDisplay(decodedValue),
        }
      }, {} as Record<string, any>)

// Prepare JSON for protobuf encoding. Some fields, like Dates, need special
// handling so that any protobuf type can be encoded.
//
// Rules:
//   (1) Strings with the 'DATE:' prefix are converted to Dates.
export const prepareProtobufJson = (msg: any): any =>
  msg instanceof Uint8Array
    ? msg
    : Array.isArray(msg)
    ? msg.map(prepareProtobufJson)
    : // Rule (1)
    typeof msg === 'string' && msg.startsWith('DATE:')
    ? new Date(msg.replace('DATE:', ''))
    : typeof msg !== 'object' || msg === null || msg.constructor !== Object
    ? msg
    : Object.entries(msg).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: prepareProtobufJson(value),
        }),
        {} as Record<string, any>
      )
