import clsx from 'clsx'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  ChainLogo,
  Modal,
  TokenAmountDisplay,
  Tooltip,
} from '@dao-dao/stateless'
import { TokenCardInfo, TokenLineProps } from '@dao-dao/types'
import {
  getDisplayNameForChainId,
  getFallbackImage,
  toAccessibleImageUrl,
  transformIbcSymbol,
} from '@dao-dao/utils'

export const TokenLine = <T extends TokenCardInfo>(
  props: TokenLineProps<T>
) => {
  const { TokenCard, token, transparentBackground, lazyInfo } = props
  const { t } = useTranslation()

  const { tokenSymbol } = transformIbcSymbol(token.symbol)

  const [cardVisible, setCardVisible] = useState(false)
  // On route change, close the card.
  const { asPath } = useRouter()
  useEffect(() => {
    setCardVisible(false)
  }, [asPath])

  return (
    <>
      <div
        className={clsx(
          'box-content grid h-8 cursor-pointer grid-cols-2 items-center gap-4 rounded-lg py-3 px-4 transition hover:bg-background-interactive-hover active:bg-background-interactive-pressed sm:grid-cols-[2fr_1fr_1fr]',
          !transparentBackground && 'bg-background-tertiary'
        )}
        onClick={() => setCardVisible(true)}
      >
        <div className="flex flex-row items-center gap-2">
          <Tooltip
            title={t('info.tokenOnChain', {
              token: tokenSymbol,
              chain: getDisplayNameForChainId(token.chainId),
            })}
          >
            <div
              className="relative h-8 w-8 rounded-full bg-cover bg-center"
              style={{
                backgroundImage: `url(${toAccessibleImageUrl(
                  token.imageUrl || getFallbackImage(token.denomOrAddress)
                )})`,
              }}
            >
              <ChainLogo
                chainId={token.chainId}
                className="absolute -bottom-1 -right-1"
                size={16}
              />
            </div>
          </Tooltip>

          <p className="title-text">${tokenSymbol}</p>
        </div>

        <TokenAmountDisplay
          amount={
            lazyInfo.loading ? { loading: true } : lazyInfo.data.totalBalance
          }
          className="body-text truncate text-right font-mono"
          decimals={token.decimals}
          hideSymbol
          showFullAmount
        />

        {/* Only show on larger screen. */}
        {lazyInfo.loading || lazyInfo.data.usdUnitPrice ? (
          <div className="hidden flex-row items-center justify-end sm:flex">
            <TokenAmountDisplay
              amount={
                lazyInfo.loading || !lazyInfo.data.usdUnitPrice
                  ? { loading: true }
                  : lazyInfo.data.totalBalance *
                    lazyInfo.data.usdUnitPrice.amount
              }
              className="caption-text font-mono"
              dateFetched={
                lazyInfo.loading
                  ? undefined
                  : lazyInfo.data.usdUnitPrice!.timestamp
              }
              estimatedUsdValue
              hideSymbol
            />
          </div>
        ) : (
          <div></div>
        )}
      </div>

      <Modal
        containerClassName="border-border-primary w-full"
        contentContainerClassName="!p-0"
        hideCloseButton
        onClose={() => setCardVisible(false)}
        visible={cardVisible}
      >
        <TokenCard {...props} />
      </Modal>
    </>
  )
}
