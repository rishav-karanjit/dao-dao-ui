import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CreateDaoContext } from '@dao-dao/tstypes'
import { parseEncodedMessage, processError } from '@dao-dao/utils'

import {
  Checkbox,
  CosmosMessageDisplay,
  DaoCreateConfigReviewCard,
} from '../../..'

export const CreateDaoReview = ({
  form: { watch },
  votingModuleDaoCreationAdapter,
  proposalModuleDaoCreationAdapters,
  generateInstantiateMsg,
}: CreateDaoContext) => {
  const { t } = useTranslation()

  const newDao = watch()
  const { votingModuleAdapter, proposalModuleAdapters } = newDao

  const [decodeModuleMessages, setDecodeModuleMessages] = useState(true)
  const togglePreviewRef = useRef<HTMLDivElement>(null)
  const [previewJson, setPreviewJson] = useState<string>()
  const [previewError, setPreviewError] = useState<string>()
  const generatePreview = useCallback(
    (scroll = true) => {
      setPreviewJson(undefined)
      setPreviewError(undefined)

      try {
        const msg = generateInstantiateMsg()
        // Convert encoded module instantiation messages back to readable JSON.
        if (decodeModuleMessages) {
          msg.proposal_modules_instantiate_info.forEach((info) => {
            info.msg = parseEncodedMessage(info.msg)
          })
          msg.voting_module_instantiate_info.msg = parseEncodedMessage(
            msg.voting_module_instantiate_info.msg
          )
        }
        // Pretty print output.
        setPreviewJson(JSON.stringify(msg, undefined, 2))
      } catch (err) {
        console.error(err)
        setPreviewError(processError(err))
      } finally {
        // Scroll to preview output or error.
        if (scroll) {
          togglePreviewRef.current?.scrollIntoView({
            behavior: 'smooth',
          })
        }
      }
    },
    [decodeModuleMessages, generateInstantiateMsg]
  )

  const togglePreview = useCallback(() => {
    // If already displaying and error does not exist (should always be true
    // together), clear. Otherwise generate the preview. This ensures that if an
    // error occurred, it will still try again.
    if (previewJson && !previewError) {
      setPreviewJson(undefined)
      setPreviewError(undefined)
    } else {
      generatePreview()
    }
  }, [generatePreview, previewError, previewJson])

  // If a message is showing and the function reference updates, indicating that
  // some input (from the dependency array of the useCallback hook) has changed,
  // regenerate the preview but don't forcibly scroll.
  useEffect(() => {
    if (previewJson) {
      generatePreview(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatePreview])

  return (
    <>
      <p className="mt-9 mb-7 text-text-body title-text">
        {t('title.governanceConfiguration')}
      </p>

      <votingModuleDaoCreationAdapter.governanceConfig.Review
        data={votingModuleAdapter.data}
        newDao={newDao}
      />

      <p className="mt-9 mb-7 text-text-body title-text">
        {t('title.votingConfiguration')}
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
        {votingModuleDaoCreationAdapter.votingConfig.items
          .concat(
            votingModuleDaoCreationAdapter.votingConfig.advancedItems ?? []
          )
          .map(
            (
              {
                onlyDisplayCondition,
                Icon,
                nameI18nKey,
                tooltipI18nKey,
                Review,
                getReviewClassName,
              },
              index
            ) =>
              // If has display condition, check it. Otherwise display.
              (onlyDisplayCondition?.(newDao) ?? true) && (
                <DaoCreateConfigReviewCard
                  key={index}
                  Icon={Icon}
                  name={t(nameI18nKey)}
                  review={
                    <Review data={votingModuleAdapter.data} newDao={newDao} />
                  }
                  reviewClassName={getReviewClassName?.(
                    votingModuleAdapter.data
                  )}
                  tooltip={tooltipI18nKey && t(tooltipI18nKey)}
                />
              )
          )}
        {proposalModuleDaoCreationAdapters.flatMap(
          ({ votingConfig: { items, advancedItems } }, index) =>
            items.concat(advancedItems ?? []).map(
              (
                {
                  onlyDisplayCondition,
                  Icon,
                  nameI18nKey,
                  tooltipI18nKey,
                  Review,
                  getReviewClassName,
                },
                itemIndex
              ) =>
                // If has display condition, check it. Otherwise display.
                (onlyDisplayCondition?.(newDao) ?? true) && (
                  <DaoCreateConfigReviewCard
                    key={`${index}:${itemIndex}`}
                    Icon={Icon}
                    name={t(nameI18nKey)}
                    review={
                      <Review
                        data={proposalModuleAdapters[index].data}
                        newDao={newDao}
                      />
                    }
                    reviewClassName={getReviewClassName?.(
                      proposalModuleAdapters[index].data
                    )}
                    tooltip={tooltipI18nKey && t(tooltipI18nKey)}
                  />
                )
            )
        )}
      </div>

      <div
        className="flex flex-row flex-wrap gap-6 items-center mt-8"
        ref={togglePreviewRef}
      >
        <div className="flex flex-row gap-2 items-center">
          <Checkbox checked={!!previewJson} onClick={togglePreview} />

          <p className="cursor-pointer body-text" onClick={togglePreview}>
            {t('button.showInstantiateMessage')}
          </p>
        </div>

        {!!previewJson && (
          <div className="flex flex-row gap-2 items-center">
            <Checkbox
              checked={decodeModuleMessages}
              onClick={() => setDecodeModuleMessages((d) => !d)}
            />

            <p
              className="cursor-pointer body-text"
              onClick={() => setDecodeModuleMessages((d) => !d)}
            >
              {t('button.withDecodedModuleMessages')}
            </p>
          </div>
        )}
      </div>
      {previewJson && (
        <div className="mt-4">
          <CosmosMessageDisplay value={previewJson} />
        </div>
      )}
      {previewError && <p className="mt-4 text-error">{previewError}</p>}
    </>
  )
}
