import { truncate } from 'lodash'
import { Issue, VocalMessage } from './core'

const ISSUE_TITLE_MAX_LENGTH = 70

/**
 * Optionnaly convert a vocal message into an issue
 * @param message
 */
export function messageToIssue(message: VocalMessage): Issue | undefined {
  if (message.content.length > 0) {
    const title = truncate(message.content, { length: ISSUE_TITLE_MAX_LENGTH })
    return {
      title,
      description: message.content,
      author: message.from,
    }
  }
}
