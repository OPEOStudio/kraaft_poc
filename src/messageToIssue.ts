import { truncate } from 'lodash'
import { Issue, VocalMessage } from './core'

const ISSUE_TITLE_MAX_LENGTH = 70

/**
 * Convert a vocal message into an issue
 * @param message
 */
export function messageToIssue(message: VocalMessage): Issue {
  const title = truncate(message.content, { length: ISSUE_TITLE_MAX_LENGTH })
  return {
    title,
    description: message.content,
    author: message.from,
  }
}
