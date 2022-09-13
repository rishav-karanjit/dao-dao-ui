import { atom } from 'recoil'

import { CwProposalSingleAdapter } from '@dao-dao/proposal-module-adapter/adapters/cw-proposal-single'
import { NewDao } from '@dao-dao/tstypes'
import { Cw4VotingAdapter } from '@dao-dao/voting-module-adapter'

import { localStorageEffectJSON } from '../effects'

export const DefaultNewDao: NewDao = {
  name: '',
  description: '',
  imageUrl: undefined,
  votingModuleAdapter: {
    id: Cw4VotingAdapter.id,
    data: Cw4VotingAdapter.daoCreation!.defaultConfig,
  },
  // Default to single choice proposal configuration.
  proposalModuleAdapters: [
    {
      id: CwProposalSingleAdapter.id,
      data: CwProposalSingleAdapter.daoCreation.defaultConfig,
    },
  ],
  advancedVotingConfigEnabled: false,
}

export const newDaoAtom = atom<NewDao>({
  key: 'newDao',
  default: DefaultNewDao,
  effects: [localStorageEffectJSON('newDao')],
})
