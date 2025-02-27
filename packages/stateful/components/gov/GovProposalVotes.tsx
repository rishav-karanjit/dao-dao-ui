import { useState } from 'react'
import { useRecoilValue } from 'recoil'

import { VoteOption } from '@dao-dao/protobuf/codegen/cosmos/gov/v1/gov'
import {
  chainStakingPoolSelector,
  govProposalVotesSelector,
} from '@dao-dao/state/recoil'
import {
  GovProposalVoteDisplay,
  Loader,
  PaginatedProposalVotes,
  ProposalVote,
  useCachedLoading,
  useChain,
} from '@dao-dao/stateless'

import { EntityDisplay } from '../EntityDisplay'
import { SuspenseLoader } from '../SuspenseLoader'

const VOTES_PER_PAGE = 10

export type GovProposalVotesProps = {
  proposalId: string
}

export const GovProposalVotes = (props: GovProposalVotesProps) => (
  <SuspenseLoader fallback={<Loader />}>
    <InnerGovProposalVotes {...props} />
  </SuspenseLoader>
)

const InnerGovProposalVotes = ({ proposalId }: GovProposalVotesProps) => {
  const { chain_id: chainId } = useChain()
  const [page, setPage] = useState(1)

  // Load total votes.
  const { total } = useRecoilValue(
    govProposalVotesSelector({
      chainId,
      proposalId: Number(proposalId),
      offset: 0,
      limit: VOTES_PER_PAGE,
    })
  )
  // Load all staked voting power.
  const { bondedTokens } = useRecoilValue(
    chainStakingPoolSelector({
      chainId,
    })
  )

  const pageVotes = useCachedLoading(
    govProposalVotesSelector({
      chainId,
      proposalId: Number(proposalId),
      offset: (page - 1) * VOTES_PER_PAGE,
      limit: VOTES_PER_PAGE,
    }),
    {
      votes: [],
      total: 0,
    }
  )

  return (
    <PaginatedProposalVotes
      EntityDisplay={EntityDisplay}
      VoteDisplay={GovProposalVoteDisplay}
      hideDownload
      hideVotedAt
      pagination={{
        page,
        setPage,
        pageSize: VOTES_PER_PAGE,
        total,
      }}
      votes={
        pageVotes.loading
          ? { loading: true }
          : {
              loading: false,
              updating: pageVotes.updating,
              data: pageVotes.data.votes.map(
                ({ voter, options, staked }): ProposalVote<VoteOption> => ({
                  voterAddress: voter,
                  vote: options.sort(
                    (a, b) => Number(b.weight) - Number(a.weight)
                  )[0].option,
                  votingPowerPercent:
                    Number(staked) / Number(BigInt(bondedTokens) / 100n),
                })
              ),
            }
      }
      votingOpen={false}
    />
  )
}
