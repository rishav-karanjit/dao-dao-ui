/**
 * This file was automatically generated by @cosmwasm/ts-codegen@0.31.6.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run the @cosmwasm/ts-codegen generate command to regenerate this file.
 */

import { Coin, StdFee } from '@cosmjs/amino'
import {
  CosmWasmClient,
  ExecuteResult,
  SigningCosmWasmClient,
} from '@cosmjs/cosmwasm-stargate'

import { Addr, CosmosMsgForEmpty } from '@dao-dao/types/contracts/common'

export interface PolytoneProxyReadOnlyInterface {
  contractAddress: string
  instantiator: () => Promise<Addr>
}
export class PolytoneProxyQueryClient
  implements PolytoneProxyReadOnlyInterface
{
  client: CosmWasmClient
  contractAddress: string

  constructor(client: CosmWasmClient, contractAddress: string) {
    this.client = client
    this.contractAddress = contractAddress
    this.instantiator = this.instantiator.bind(this)
  }

  instantiator = async (): Promise<Addr> => {
    return this.client.queryContractSmart(this.contractAddress, {
      instantiator: {},
    })
  }
}
export interface PolytoneProxyInterface extends PolytoneProxyReadOnlyInterface {
  contractAddress: string
  sender: string
  proxy: (
    {
      msgs,
    }: {
      msgs: CosmosMsgForEmpty[]
    },
    fee?: number | StdFee | 'auto',
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>
}
export class PolytoneProxyClient
  extends PolytoneProxyQueryClient
  implements PolytoneProxyInterface
{
  client: SigningCosmWasmClient
  sender: string
  contractAddress: string

  constructor(
    client: SigningCosmWasmClient,
    sender: string,
    contractAddress: string
  ) {
    super(client, contractAddress)
    this.client = client
    this.sender = sender
    this.contractAddress = contractAddress
    this.proxy = this.proxy.bind(this)
  }

  proxy = async (
    {
      msgs,
    }: {
      msgs: CosmosMsgForEmpty[]
    },
    fee: number | StdFee | 'auto' = 'auto',
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        proxy: {
          msgs,
        },
      },
      fee,
      memo,
      _funds
    )
  }
}
