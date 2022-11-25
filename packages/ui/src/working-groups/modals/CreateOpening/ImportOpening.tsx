// TODO duplicates RestoreVotesModal
import React, { useEffect, useCallback, useReducer } from 'react'
import * as Yup from 'yup'

import { ButtonPrimary } from '@/common/components/buttons'
import { FileEntry, FileInput } from '@/common/components/forms/FileInput'

import { Opening, OpeningSchema } from './CreateOpening'

type Value = FileEntry & { content?: Opening }
type Action = { type: 'set-file'; value: File } | { type: 'set-content'; value: string }

const parseContent = (contentJson: any): Pick<Value, 'errors' | 'content'> => {
  try {
    const content: Opening = JSON.parse(contentJson)
    OpeningSchema.validateSync(content)
    return { content, errors: [] }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { errors: [new Yup.ValidationError(error.message)] }
    } else if (error instanceof Yup.ValidationError) {
      return { errors: [error] }
    } else throw error
  }
}

const valueReducer = (value: undefined | Value, action: Action): undefined | Value => {
  switch (action.type) {
    case 'set-file':
      return { file: action.value }

    case 'set-content':
      if (value) {
        return { file: value.file, ...parseContent(action.value) }
      }
  }
}

export interface ImportOpeningProps {
  handleChange: (o: Opening) => void
  onHide: () => void
}

export const ImportOpening = ({ handleChange, onHide }: ImportOpeningProps) => {
  const [value, dispatch] = useReducer(valueReducer, undefined)

  const onUpload = useCallback(async ([file]: File[]) => {
    if (!file) return
    dispatch({ type: 'set-file', value: file })
    const contentJson = await file.text()
    dispatch({ type: 'set-content', value: contentJson })
  }, [])

  useEffect(() => {
    if (value?.content) {
      handleChange(value.content)
      onHide()
    }
  }, [value])

  return (
    <>
      Note: This will override current form input.
      <FileInput title="Drag and drop file here to restore" accept="application/json" value={[]} onChange={onUpload} />
      {value?.errors?.length && value.errors.map((error, index) => <div key={index}>{new String(error)}</div>)}
    </>
  )
}
