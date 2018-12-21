import config from 'config'
import * as request from 'request-promise'
import { Promise } from 'es6-promise'
import { Issue } from './core'

const apiKey = config.get<string>('trello.api_key')
const apiToken = config.get<string>('trello.api_token')
const listId = config.get<string>('trello.list_id')

export function createIssue(issue: Issue): Promise<string> {
  return request.post('https://api.trello.com/1/cards', {
    qs: {
      key: apiKey,
      token: apiToken,
      name: issue.title,
      desc: `Par ${issue.author}.\n\n${issue.description}`,
      idList: listId,
    },
    json: true,
  }).then(
    result => result.id,
    error => Promise.reject(`Issue "${issue.title}" creation failed: ${error}`),
  )
}
